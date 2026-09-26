import { test, expect } from '@playwright/test';

const agentHeaders = {
  Authorization: 'Bearer test-agent-key',
  'Content-Type': 'application/json',
};

test.describe('Smart Cache, Exemption Learning, and False-Positive Protection', () => {
  test('does NOT block essential delivery actions like "Fix login bug" for "Ship MVP"', async ({ request }) => {
    const response = await request.post('/api/v1/agent/guardrail/drift-check', {
      headers: agentHeaders,
      data: {
        originalGoal: 'Ship MVP',
        agentOutput: 'Fix login bug',
      },
    });

    const body = await response.json();
    expect(response.ok()).toBe(true);
    expect(body.status).toBe('ALLOW');
    expect(body.decision).toBe('ALLOW');
    expect(body.driftScore).toBeLessThan(40);
  });

  test('smart cache yields X-Cache-Status: HIT on repeated /api/v1/agent/decompose calls', async ({ request }) => {
    const payload = {
      goalTitle: `Deploy production PostgreSQL database on Google Cloud ${Date.now()}`,
      technicalContext: { region: 'asia-southeast1' },
    };

    // First call: MISS
    const firstRes = await request.post('/api/v1/agent/decompose', {
      headers: agentHeaders,
      data: payload,
    });
    expect(firstRes.ok()).toBe(true);
    expect(firstRes.headers()['x-cache-status']).toBe('MISS');

    // Second call: HIT with 0 extra token usage
    const secondRes = await request.post('/api/v1/agent/decompose', {
      headers: agentHeaders,
      data: payload,
    });
    expect(secondRes.ok()).toBe(true);
    expect(secondRes.headers()['x-cache-status']).toBe('HIT');

    const cacheStatsRes = await request.get('/api/smart-cache-stats');
    const data = await cacheStatsRes.json();
    const hits = data.stats?.hits ?? data.hits;
    expect(hits).toBeGreaterThanOrEqual(1);
  });

  test('supports recording "NOT A RABBIT HOLE" exemptions via API to calibrate future checks', async ({ request }) => {
    const customTask = 'Viết parser binary đặc biệt cho giao thức telemetry';
    const coreGoal = 'Ship Telemetry MVP';

    // Record exemption
    const exemptRes = await request.post('/api/v1/agent/guardrail/exemptions', {
      headers: agentHeaders,
      data: {
        taskTitle: customTask,
        coreGoalTitle: coreGoal,
        reason: 'Approved binary telemetry parser for embedded firmware',
      },
    });

    expect(exemptRes.status()).toBe(201);
    const exemptData = await exemptRes.json();
    expect(exemptData.status).toBe('EXEMPTION_RECORDED');

    // Verify subsequent drift check acknowledges exemption and allows it
    const checkRes = await request.post('/api/v1/agent/guardrail/drift-check', {
      headers: agentHeaders,
      data: {
        originalGoal: coreGoal,
        agentOutput: customTask,
      },
    });

    const checkData = await checkRes.json();
    expect(checkData.decision).toBe('ALLOW');
    expect(checkData.driftScore).toBe(0);
    expect(checkData.isExempted).toBe(true);
  });
});
