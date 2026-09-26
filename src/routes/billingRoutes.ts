import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { BILLING_PLANS, getPlan, resolvePriceId } from '../billing/plans.ts';
import {
  getOrCreateTenant,
  getTenant,
  issueApiKey,
  getUsageSummary,
  updateTenantSubscription,
  findTenantByCustomerId,
} from '../billing/billingStore.ts';

export const billingRouter = Router();

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.trim() === '') return null;
  return new Stripe(key.trim());
}

// GET /api/billing/plans - public pricing catalog
billingRouter.get('/plans', (_req: Request, res: Response) => {
  return res.json({
    plans: Object.values(BILLING_PLANS),
    overageNote: 'Free blocks at quota. Pro/Team continue with $0.002/call overage.',
    byokNote: 'Customers bring their own GEMINI_API_KEY (BYOK) - SymFlowAge only meters guardrail logic.',
  });
});

// POST /api/billing/api-keys - issue a metered M2M key (BYOK-friendly)
billingRouter.post('/api-keys', (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'valid email is required' });
  const name = typeof req.body?.name === 'string' ? req.body.name.slice(0, 60) : 'default';
  const tenant = getOrCreateTenant(email);
  const { rawKey, record } = issueApiKey(tenant.id, name);
  return res.status(201).json({
    tenantId: tenant.id,
    email: tenant.email,
    planId: tenant.planId,
    apiKey: rawKey,
    keyPrefix: record.keyPrefix,
    usage: getUsageSummary(tenant.id),
    mcpConfig: {
      url: `${process.env.APP_URL || 'http://localhost:3000'}/api/mcp/sse`,
      headers: { Authorization: `Bearer ${rawKey}` },
    },
  });
});

// GET /api/billing/usage?tenantId=xxx
billingRouter.get('/usage', (req: Request, res: Response) => {
  const tenantId = String(req.query.tenantId || '');
  if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
  const t = getTenant(tenantId);
  if (!t) return res.status(404).json({ error: 'tenant_not_found' });
  return res.json(getUsageSummary(tenantId));
});

// POST /api/billing/checkout - create Stripe Checkout Session (or mock when no key)
billingRouter.post('/checkout', async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const planId = typeof req.body?.planId === 'string' ? req.body.planId : 'pro';
    const plan = getPlan(planId);
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'valid email is required' });
    if (plan.id === 'free') return res.status(400).json({ error: 'free plan needs no checkout' });

    const tenant = getOrCreateTenant(email);
    const priceId = resolvePriceId(plan.id);
    const stripe = getStripe();
    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

    if (!stripe || !priceId) {
      // Mock mode: no STRIPE_SECRET_KEY yet - return upgrade intent so frontend can proceed
      updateTenantSubscription(tenant.id, { planId: plan.id, status: 'pending_checkout' });
      return res.json({
        mode: 'mock',
        message: 'Set STRIPE_SECRET_KEY + STRIPE_PRICE_* to enable live checkout.',
        tenantId: tenant.id,
        planId: plan.id,
        checkoutUrl: `${appUrl}/pricing?plan=${plan.id}&tenant=${tenant.id}&mock=1`,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?cancelled=1`,
      metadata: { tenantId: tenant.id, planId: plan.id },
    });
    updateTenantSubscription(tenant.id, { planId: plan.id, status: 'pending_checkout' });
    return res.json({ mode: 'live', tenantId: tenant.id, planId: plan.id, checkoutUrl: session.url });
  } catch (err: any) {
    console.error('[billing/checkout] failed:', err?.message || err);
    return res.status(500).json({ error: 'checkout_failed' });
  }
});

// POST /api/billing/webhook - Stripe webhook (idempotent)
billingRouter.post('/webhook', async (req: Request, res: Response) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  try {
    let event: Stripe.Event;
    if (stripe && webhookSecret) {
      const sig = req.headers['stripe-signature'] as string;
      // NOTE: requires express.raw for this route (mounted before express.json)
      event = stripe.webhooks.constructEvent((req as any).body, sig, webhookSecret);
    } else {
      event = req.body; // mock/local testing path
    }

    const type = (event as any)?.type || '';
    const obj: any = (event as any)?.data?.object || {};

    if (type === 'checkout.session.completed') {
      const tenantId = obj?.metadata?.tenantId;
      const planId = obj?.metadata?.planId || 'pro';
      if (tenantId) {
        updateTenantSubscription(tenantId, {
          planId,
          status: 'active',
          stripeCustomerId: obj?.customer || null,
          stripeSubscriptionId: obj?.subscription || null,
          currentPeriodStart: new Date(),
        });
      }
    }
    if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
      const customerId = obj?.customer;
      const t = customerId ? findTenantByCustomerId(String(customerId)) : undefined;
      if (t) {
        updateTenantSubscription(t.id, {
          status: type.includes('deleted') ? 'cancelled' : obj?.status || t.status,
          planId: type.includes('deleted') ? 'free' : t.planId,
        });
      }
    }
    return res.json({ received: true, type });
  } catch (err: any) {
    console.error('[billing/webhook] failed:', err?.message || err);
    return res.status(400).json({ error: 'webhook_failed' });
  }
});
