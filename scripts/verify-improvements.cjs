const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.SYMFLOWAGE_M2M_API_KEY || 'test-agent-key';

async function postJson(path, body, extraHeaders = {}) {
  const url = BASE.replace(/\/$/, '') + path;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  });
  let j = {};
  try { j = await r.json(); } catch { j = {}; }
  return { status: r.status, json: j, headers: r.headers };
}

(async () => {
  console.log(`Connecting to: ${BASE}`);
  console.log('\n=== TEST 1: False Positive Fix on Core Delivery Task ===');
  const fpRes = await postJson('/api/v1/agent/guardrail/drift-check', {
    originalGoal: 'Ship MVP',
    agentOutput: 'Fix login bug',
  }, { Authorization: `Bearer ${API_KEY}` });

  console.log(`Fix login bug for Ship MVP -> status=${fpRes.json.status}, decision=${fpRes.json.decision}, driftScore=${fpRes.json.driftScore}`);
  if (fpRes.json.decision !== 'ALLOW') {
    throw new Error(`Expected ALLOW but got ${fpRes.json.decision} (driftScore=${fpRes.json.driftScore})`);
  }

  console.log('\n=== TEST 2: Real Rabbit Hole Detection Still Blocks ===');
  const blockRes = await postJson('/api/v1/agent/guardrail/drift-check', {
    originalGoal: 'Ship MVP',
    agentOutput: 'Thiết kế Kubernetes multi-region cluster cho MVP 2 ngày',
    circuitBreakerThreshold: 65,
  }, { Authorization: `Bearer ${API_KEY}` });

  console.log(`Kubernetes for 2-day MVP -> status=${blockRes.json.status}, decision=${blockRes.json.decision}, driftScore=${blockRes.json.driftScore}`);
  if (blockRes.json.decision !== 'BLOCK') {
    throw new Error(`Expected BLOCK but got ${blockRes.json.decision}`);
  }

  console.log('\n=== TEST 3: Smart Cache on /api/v1/agent/decompose ===');
  const uniqueGoal = `Build Stripe Checkout Flow ${Date.now()}`;
  const d1 = await postJson('/api/v1/agent/decompose', {
    goalTitle: uniqueGoal,
    technicalContext: { framework: 'Node.js' }
  }, { Authorization: `Bearer ${API_KEY}` });
  console.log(`Decompose Call 1 -> Cache-Status: ${d1.headers.get('x-cache-status')}, cached: ${d1.json.cached}`);

  const d2 = await postJson('/api/v1/agent/decompose', {
    goalTitle: uniqueGoal,
    technicalContext: { framework: 'Node.js' }
  }, { Authorization: `Bearer ${API_KEY}` });
  console.log(`Decompose Call 2 -> Cache-Status: ${d2.headers.get('x-cache-status')}, cached: ${d2.json.cached}`);

  if (d2.headers.get('x-cache-status') !== 'HIT') {
    throw new Error(`Expected X-Cache-Status HIT on 2nd decompose call! Got: ${d2.headers.get('x-cache-status')}`);
  }

  console.log('\n=== TEST 4: Smart Cache Stats Verification ===');
  const statsRes = await fetch(BASE.replace(/\/$/, '') + '/api/smart-cache-stats').then(r => r.json());
  const hits = statsRes.stats?.hits ?? statsRes.hits ?? 0;
  console.log('Smart Cache Stats:', {
    totalRequests: statsRes.stats?.totalRequests ?? statsRes.totalRequests,
    hits,
    misses: statsRes.stats?.misses ?? statsRes.misses,
    hitRatioPct: statsRes.stats?.hitRatioPct ?? statsRes.hitRatioPct
  });
  if (hits < 1) {
    throw new Error(`Expected smart cache hits >= 1, got ${hits}`);
  }

  console.log('\n=== TEST 5: Exemption API (Đây KHÔNG phải rabbit hole) ===');
  const customTask = `Tự viết micro parser tối ưu riêng cho giao thức nội bộ ${Date.now()}`;
  const exemptRes = await postJson('/api/v1/agent/guardrail/exemptions', {
    taskTitle: customTask,
    coreGoalTitle: 'Ship Custom Protocol MVP',
    reason: 'Được tech lead phê duyệt do giao thức binary đặc thù',
  }, { Authorization: `Bearer ${API_KEY}` });
  console.log('Exemption created status:', exemptRes.status, 'result:', exemptRes.json.status);

  const checkExempt = await postJson('/api/v1/agent/guardrail/drift-check', {
    originalGoal: 'Ship Custom Protocol MVP',
    agentOutput: customTask,
  }, { Authorization: `Bearer ${API_KEY}` });
  console.log(`Check exempted task -> decision=${checkExempt.json.decision}, driftScore=${checkExempt.json.driftScore}, isExempted=${checkExempt.json.isExempted}`);

  if (checkExempt.json.decision !== 'ALLOW') {
    throw new Error(`Expected ALLOW for exempted task!`);
  }

  console.log('\n========================================');
  console.log('>>> ALL 5 VERIFICATION TESTS PASSED! <<<');
  console.log('========================================\n');
})().catch((err) => {
  console.error('\n❌ FAILED:', err.message);
  process.exit(1);
});
