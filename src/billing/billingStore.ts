/**
 * SymFlowAge Billing Store - in-memory first, Postgres best-effort.
 * Mirrors the resilient pattern in src/db/predictions.ts so billing works
 * with zero DATABASE_URL (local dev) and persists when DB is configured.
 */
import { randomUUID, createHash } from 'crypto';
import { db, isDbConfigured } from '../db/index.ts';
import { getPlan } from './plans.ts';

export interface TenantRecord {
  id: string;
  email: string;
  planId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
}

export interface ApiKeyRecord {
  id: string;
  tenantId: string;
  keyPrefix: string;
  keyHash: string;
  name: string;
  revoked: boolean;
  createdAt: Date;
}

export interface UsageRecord {
  tenantId: string;
  route: string;
  count: number;
  periodKey: string;
}

// In-memory fallbacks (survive hot-reload via module state)
const tenants = new Map<string, TenantRecord>();
const tenantsByEmail = new Map<string, string>();
const apiKeys = new Map<string, ApiKeyRecord>(); // hash -> record
const rawKeyToTenant = new Map<string, string>(); // dev-only plaintext index
const usage = new Map<string, number>(); // `${tenantId}:${periodKey}:${route}` -> count

function periodKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function currentPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export function getPeriodKey(): string {
  return periodKey();
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export function getOrCreateTenant(email: string): TenantRecord {
  const norm = email.trim().toLowerCase();
  const existingId = tenantsByEmail.get(norm);
  if (existingId) {
    const t = tenants.get(existingId);
    if (t) return t;
  }
  const { start, end } = currentPeriod();
  const t: TenantRecord = {
    id: `tnt_${randomUUID().slice(0, 8)}`,
    email: norm,
    planId: 'free',
    status: 'active',
    currentPeriodStart: start,
    currentPeriodEnd: end,
    createdAt: new Date(),
  };
  tenants.set(t.id, t);
  tenantsByEmail.set(norm, t.id);
  // Best-effort Postgres persist (tables optional - skipped if missing)
  if (isDbConfigured) {
    void (async () => {
      try {
        await db.execute(
          `INSERT INTO tenants (id, email, plan_id, status) VALUES ('${t.id}', '${norm}', 'free', 'active') ON CONFLICT DO NOTHING` as any
        );
      } catch { /* optional table */ }
    })();
  }
  return t;
}

export function getTenant(id: string): TenantRecord | undefined {
  return tenants.get(id);
}

export function updateTenantSubscription(tenantId: string, patch: Partial<TenantRecord>): TenantRecord | undefined {
  const t = tenants.get(tenantId);
  if (!t) return undefined;
  Object.assign(t, patch);
  return t;
}

export function findTenantByCustomerId(customerId: string): TenantRecord | undefined {
  for (const t of tenants.values()) {
    if (t.stripeCustomerId === customerId) return t;
  }
  return undefined;
}

export function issueApiKey(tenantId: string, name = 'default'): { rawKey: string; record: ApiKeyRecord } {
  const rawKey = `sk_live_${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '').slice(0, 8)}`;
  const hash = sha256(rawKey);
  const record: ApiKeyRecord = {
    id: `key_${randomUUID().slice(0, 8)}`,
    tenantId,
    keyPrefix: rawKey.slice(0, 12),
    keyHash: hash,
    name,
    revoked: false,
    createdAt: new Date(),
  };
  apiKeys.set(hash, record);
  rawKeyToTenant.set(rawKey, tenantId); // dev convenience; production should only store hash
  return { rawKey, record };
}

export function resolveTenantByRawKey(rawKey: string): TenantRecord | undefined {
  // Fast path: plaintext index (dev)
  const tid = rawKeyToTenant.get(rawKey);
  if (tid) {
    const t = tenants.get(tid);
    if (t) return t;
  }
  // Hash lookup
  const rec = apiKeys.get(sha256(rawKey));
  if (rec && !rec.revoked) return tenants.get(rec.tenantId);
  return undefined;
}

export function recordUsage(tenantId: string, route: string): { count: number; periodKey: string } {
  const pk = periodKey();
  const k = `${tenantId}:${pk}:${route}`;
  const count = (usage.get(k) || 0) + 1;
  usage.set(k, count);
  return { count, periodKey: pk };
}

export function getUsageSummary(tenantId: string) {
  const pk = periodKey();
  const t = tenants.get(tenantId);
  const plan = getPlan(t?.planId || 'free');
  let total = 0;
  const byRoute: Record<string, number> = {};
  for (const [k, v] of usage.entries()) {
    const [tid, p, ...rest] = k.split(':');
    if (tid === tenantId && p === pk) {
      const route = rest.join(':');
      byRoute[route] = v;
      total += v;
    }
  }
  const remaining = Math.max(0, plan.monthlyQuota - total);
  const overage = Math.max(0, total - plan.monthlyQuota);
  return {
    tenantId,
    planId: plan.id,
    planName: plan.name,
    periodKey: pk,
    monthlyQuota: plan.monthlyQuota,
    used: total,
    remaining,
    overageCalls: overage,
    overageUsd: Math.round(overage * plan.overagePerCallUsd * 100) / 100,
    byRoute,
  };
}

export function checkQuota(tenantId: string): { allowed: boolean; summary: ReturnType<typeof getUsageSummary> } {
  const summary = getUsageSummary(tenantId);
  // Free plan: hard block at quota. Paid: allow with overage billing.
  if (summary.planId === 'free' && summary.used >= summary.monthlyQuota) {
    return { allowed: false, summary };
  }
  return { allowed: true, summary };
}
