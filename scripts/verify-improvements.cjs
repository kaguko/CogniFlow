const BASE = 'http://localhost:3000';

async function postJson(path, body, extraHeaders = {}) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  });
  let j = {};
  try { j = await r.json(); } catch { j = {}; }
  return { status: r.status, json: j, headers: r.headers };
}

(async () => {
  console.log('\n=== TEST 1: False Positive Fix on Core Delivery Task ===');
  const fpRes = await postJson('/api/v1/agent/guardrail/drift-check', {
    originalGoal: 'Ship MVP',
    agentOutput: 'Fix login bug',
  }, { Authorization: 'Bearer test-agent-key' });
  console.log(`Fix login bug for Ship MVP -> status=${fpRes.json.status}, decision=${fpRes.json.decision}, driftScore=${fpRes.json.driftScore}`);
  if (fpRes.json.decision !== 'ALLOW') {
    throw new Error(`Expected ALLOW but got ${fpRes.json.decision}`);
  }

  console.log('\n=== TEST 2: Real Rabbit Hole Detection Still Blocks ===');
  const blockRes = await postJson('/api/v1/agent/guardrail/drift-check', {
    originalGoal: 'Ship MVP',
    agentOutput: 'Thiết kế Kubernetes multi-region cluster cho MVP 2 ngày',
    circuitBreakerThreshold: 65,
  }, { Authorization: 'Bearer test-agent-key' });
  console.log(`Kubernetes for 2-day MVP -> status=${blockRes.json.status}, decision=${blockRes.json.decision}, driftScore=${blockRes.json.driftScore}`);
  if (blockRes.json.decision !== 'BLOCK') {
    throw new Error(`Expected BLOCK but got ${blockRes.json.decision}`);
  }

  console.log('\n=== TEST 3: Smart Cache on /api/v1/agent/decompose ===');
  const d1 = await postJson('/api/v1/agent/decompose', {
    goalTitle: 'Build Stripe Checkout Flow',
    technicalContext: { framework: 'Node.js' }
  }, { Authorization: 'Bearer test-agent-key' });
  console.log(`Decompose Call 1 -> Cache-Status: ${d1.headers.get('x-cache-status')}, cached: ${d1.json.cached}`);

  const d2 = await postJson('/api/v1/agent/decompose', {
    goalTitle: 'Build Stripe Checkout Flow',
    technicalContext: { framework: 'Node.js' }
  }, { Authorization: 'Bearer test-agent-key' });
  console.log(`Decompose Call 2 -> Cache-Status: ${d2.headers.get('x-cache-status')}, cached: ${d2.json.cached}`);

  if (d2.headers.get('x-cache-status') !== 'HIT') {
    throw new Error(`Expected X-Cache-Status HIT on 2nd decompose call!`);
  }

  console.log('\n=== TEST 4: Smart Cache Stats Verification ===');
  const statsRes = await fetch(BASE + '/api/smart-cache-stats').then(r => r.json());
  console.log('Smart Cache Stats:', statsRes);
  if (statsRes.hits < 1) {
    throw new Error(`Expected smart cache hits >= 1`);
  }

  console.log('\n=== TEST 5: Exemption API (Đây KHÔNG phải rabbit hole) ===');
  const exemptRes = await postJson('/api/v1/agent/guardrail/exemptions', {
    taskTitle: 'Tự viết micro parser tối ưu riêng cho giao thức nội bộ',
    coreGoalTitle: 'Ship Custom Protocol MVP',
    reason: 'Được tech lead phê duyệt do giao thức binary đặc thù',
  }, { Authorization: 'Bearer test-agent-key' });
  console.log('Exemption created:', exemptRes.status, exemptRes.json.status);

  const checkExempt = await postJson('/api/v1/agent/guardrail/drift-check', {
    originalGoal: 'Ship Custom Protocol MVP',
    agentOutput: 'Tự viết micro parser tối ưu riêng cho giao thức nội bộ',
  }, { Authorization: 'Bearer test-agent-key' });
  console.log(`Check exempted task -> decision=${checkExempt.json.decision}, driftScore=${checkExempt.json.driftScore}, isExempted=${checkExempt.json.isExempted}`);

  if (checkExempt.json.decision !== 'ALLOW') {
    throw new Error(`Expected ALLOW for exempted task!`);
  }

  console.log('\n>>> ALL 5 TESTS PASSED PERFECTLY! <<<');
})().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
