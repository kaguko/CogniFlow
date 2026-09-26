/**
 * SymFlowAge Billing Plans - Single source of truth for monetization.
 * Free 1k / Pro 50k / Team 250k calls per month + overage.
 */
export interface BillingPlan {
  id: string;
  name: string;
  priceUsdMonthly: number;
  monthlyQuota: number;
  overagePerCallUsd: number;
  stripePriceIdEnv: string;
  features: string[];
}

export const BILLING_PLANS: Record<string, BillingPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    priceUsdMonthly: 0,
    monthlyQuota: 1000,
    overagePerCallUsd: 0,
    stripePriceIdEnv: '',
    features: ['1,000 MCP calls/month', '1 project', 'Community support'],
  },
  pro: {
    id: 'pro',
    name: 'Pro Solo',
    priceUsdMonthly: 19,
    monthlyQuota: 50000,
    overagePerCallUsd: 0.002,
    stripePriceIdEnv: 'STRIPE_PRICE_PRO',
    features: ['50k calls/month', 'Accuracy history 90 days', 'Slack/Discord webhook', 'Full VSCode dashboard'],
  },
  team: {
    id: 'team',
    name: 'Team',
    priceUsdMonthly: 99,
    monthlyQuota: 250000,
    overagePerCallUsd: 0.002,
    stripePriceIdEnv: 'STRIPE_PRICE_TEAM',
    features: ['250k calls/month', 'Per-dev x-agent-id tracking', 'Team drift dashboard', 'SSO (upcoming)'],
  },
};

export function getPlan(id: string): BillingPlan {
  return BILLING_PLANS[id] || BILLING_PLANS.free;
}

export function resolvePriceId(planId: string): string | undefined {
  const plan = getPlan(planId);
  if (!plan.stripePriceIdEnv) return undefined;
  const v = process.env[plan.stripePriceIdEnv];
  return v && v.trim() !== '' ? v.trim() : undefined;
}
