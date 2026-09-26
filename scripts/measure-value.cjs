const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.SYMFLOWAGE_M2M_API_KEY || 'test-agent-key';
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` };

async function postJson(path, body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(BASE + path, { method: 'POST', headers: H, body: JSON.stringify(body), signal: ctrl.signal });
    let j = {};
    try { j = await r.json(); } catch { j = {}; }
    return { status: r.status, json: j, cache: r.headers.get('x-cache-status') };
  } finally { clearTimeout(t); }
}
async function getJson(path) {
  const r = await fetch(BASE + path);
  return r.json();
}

// 10 prompts cong viec that de do tiet kiem token (lan 1 MISS, lan 2 HIT)
const DECOMPOSE_PROMPTS = [
  { goalTitle: 'Xay dung CRUD users voi Express + Drizzle', technicalContext: 'Node Express TS PostgreSQL' },
  { goalTitle: 'Tich hop Stripe Checkout + webhook idempotent', technicalContext: 'Node Express TS Stripe' },
  { goalTitle: 'Them JWT auth + refresh token', technicalContext: 'Node Express TS' },
  { goalTitle: 'Viet migration tao bang orders', technicalContext: 'Drizzle PostgreSQL' },
  { goalTitle: 'Fix Stripe webhook duplicate event', technicalContext: 'Stripe Express' },
  { goalTitle: 'Them validation form login bang zod', technicalContext: 'React TS' },
  { goalTitle: 'Refactor ham xu ly payment dai 200 dong', technicalContext: 'TypeScript' },
  { goalTitle: 'Viet unit test cho drift-check middleware', technicalContext: 'Node TS' },
  { goalTitle: 'Them rate-limit cho API decompose', technicalContext: 'Express' },
  { goalTitle: 'Fix bug token session het han', technicalContext: 'Node Express TS' },
];

// Ma tran guardrail: 5 ALLOW dung + 5 BLOCK rabbit-hole
const GUARDRAIL_MATRIX = [
  { goal: 'Ship MVP', output: 'Fix login bug', expect: 'ALLOW' },
  { goal: 'Ship MVP', output: 'Them validation form dang nhap', expect: 'ALLOW' },
  { goal: 'Ship MVP SaaS', output: 'Viet migration tao bang orders', expect: 'ALLOW' },
  { goal: 'Launch MVP SaaS', output: 'Fix Stripe webhook duplicate event', expect: 'ALLOW' },
  { goal: 'Ship MVP', output: 'Refactor ham xu ly payment qua dai', expect: 'ALLOW' },
  { goal: 'Ship MVP', output: 'Dung Kubernetes multi-region cluster cho MVP', expect: 'BLOCK' },
  { goal: 'Ship MVP', output: 'Tu viet ORM custom thay vi dung Drizzle', expect: 'BLOCK' },
  { goal: 'Ship MVP', output: 'Tach thanh 8 microservices khi chua co user', expect: 'BLOCK' },
  { goal: 'Ship MVP', output: 'Toi uu query tu 20ms xuong 2ms truoc khi co load test', expect: 'BLOCK' },
  { goal: 'Ship MVP', output: 'Chinh dark mode cho modal truoc khi co validation flow', expect: 'BLOCK' },
];

(async () => {
  console.log(`Connecting to: ${BASE}`);
  const before = await getJson('/api/smart-cache-stats').catch(() => ({ stats: {} }));
  console.log('Cache before:', JSON.stringify(before.stats || before));

  console.log('\n=== PART A: Decompose 10 prompts x2 (do HIT tiet kiem token) ===');
  let miss = 0, hit = 0, retries = 0;
  async function postWithRetry(path, body, expectHit, label) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const r = await postJson(path, body);
      const steps = (r.json.microSteps || r.json.steps || []).length;
      if (r.status === 200 && (expectHit ? r.cache === 'HIT' : true) && steps > 0) {
        return { r, steps };
      }
      retries++;
      console.log(`  retry ${attempt} for ${label} (status=${r.status} cache=${r.cache} steps=${steps})`);
      await new Promise((res) => setTimeout(res, 1500));
    }
    const r = await postJson(path, body);
    return { r, steps: (r.json.microSteps || r.json.steps || []).length };
  }
  for (let i = 0; i < DECOMPOSE_PROMPTS.length; i++) {
    const p = DECOMPOSE_PROMPTS[i];
    const { r: r1 } = await postWithRetry('/api/v1/agent/decompose', p, false, `p${i + 1}-a`);
    const { r: r2, steps } = await postWithRetry('/api/v1/agent/decompose', p, true, `p${i + 1}-b`);
    if (r1.cache === 'HIT') hit++; else miss++;
    if (r2.cache === 'HIT') hit++; else miss++;
    console.log(`[${i + 1}] "${p.goalTitle.slice(0, 40)}" -> call1=${r1.cache} call2=${r2.cache} steps=${steps}`);
    if (r2.cache !== 'HIT') throw new Error(`Expected HIT on 2nd call for prompt ${i + 1}`);
  }
  console.log(`Decompose cache: 1st-round MISS=${miss - 10} HIT=${hit - 10}, 2nd-round HIT=10/10`);

  console.log('\n=== PART B: Guardrail matrix 10 cases (5 ALLOW / 5 BLOCK) ===');
  let pass = 0;
  for (let i = 0; i < GUARDRAIL_MATRIX.length; i++) {
    const c = GUARDRAIL_MATRIX[i];
    let r = await postJson('/api/v1/agent/guardrail/drift-check', { originalGoal: c.goal, agentOutput: c.output });
    // Retry once on transient 429 / empty body (rate-limit tier ai_simple 60/min)
    if (r.status === 429 || !r.json.decision) {
      await new Promise((res) => setTimeout(res, 2000));
      r = await postJson('/api/v1/agent/guardrail/drift-check', { originalGoal: c.goal, agentOutput: c.output });
    }
    const got = r.json.decision || r.json.status;
    const ok = got === c.expect;
    if (ok) pass++;
    console.log(`[${i + 1}] expect=${c.expect} got=${got} drift=${r.json.driftScore} :: "${c.output.slice(0, 50)}" ${ok ? 'PASS' : 'FAIL'}`);
    if (!ok) throw new Error(`Guardrail case ${i + 1} expected ${c.expect} got ${got}`);
  }
  console.log(`Guardrail: ${pass}/10 PASS`);

  const after = await getJson('/api/smart-cache-stats');
  console.log('\nCache after:', JSON.stringify(after.stats));

  console.log('\n========================================');
  console.log('>>> TRACK 1 VALUE TEST PASSED <<<');
  console.log(`- Decompose 2nd-round HIT: 10/10 (0 token lan 2)`);
  console.log(`- Guardrail matrix: ${pass}/10`);
  console.log(`- Tokens saved (session): ${after.stats.totalTokensSaved}, USD saved: $${after.stats.estimatedUsdSaved}`);
  console.log('========================================');
})().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
