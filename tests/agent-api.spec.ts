import { test, expect } from '@playwright/test';

const agentHeaders = {
  Authorization: 'Bearer test-agent-key',
  'Content-Type': 'application/json',
};

test.describe('Versioned Agent API', () => {
  test('requires M2M credentials', async ({ request }) => {
    const response = await request.post('/api/v1/agent/decompose', {
      data: { goalTitle: 'Ship MVP' },
    });

    expect(response.status()).toBe(401);
    expect((await response.json()).error).toBe('invalid_agent_credentials');
  });

  test('returns a decomposition contract for an authenticated agent', async ({ request }) => {
    const response = await request.post('/api/v1/agent/decompose', {
      headers: agentHeaders,
      data: {
        goalTitle: 'Ship MVP SaaS',
        technicalContext: 'Node.js and PostgreSQL',
      },
    });
    const body = await response.json();

    expect(response.ok()).toBe(true);
    expect(body.contractVersion).toBe('agent.v1');
    expect(body.requestId).toBeTruthy();
    expect(body.microSteps.length).toBeGreaterThan(0);
  });

  test('blocks agent output that diverges from the original goal', async ({ request }) => {
    const response = await request.post('/api/v1/agent/guardrail/drift-check', {
      headers: agentHeaders,
      data: {
        originalGoal: 'Build a Node.js payment API',
        agentOutput: 'Dựng Kubernetes multi-region cluster cho hệ thống analytics',
        circuitBreakerThreshold: 40,
      },
    });
    const body = await response.json();

    expect(response.ok()).toBe(true);
    expect(body.status).toBe('BLOCK');
    expect(body.decision).toBe('BLOCK');
    expect(body.driftScore).toBeGreaterThanOrEqual(40);
  });
});