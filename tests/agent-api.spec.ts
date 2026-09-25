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

  test('feeds drift outcomes into the next decomposition context', async ({ request }) => {
    const outcomeResponse = await request.post('/api/v1/agent/outcomes', {
      headers: agentHeaders,
      data: {
        requestId: `self-improvement-${Date.now()}`,
        outcomeStatus: 'DRIFT',
        actualDriftScore: 60,
        notes: 'Không mở rộng kiến trúc trước khi test contract hiện tại chạy xanh.',
      },
    });
    const outcome = await outcomeResponse.json();

    const decompositionResponse = await request.post('/api/v1/agent/decompose', {
      headers: agentHeaders,
      data: { goalTitle: 'Cải thiện vòng lặp MCP self-improvement' },
    });
    const decomposition = await decompositionResponse.json();

    expect(outcomeResponse.status()).toBe(201);
    expect(outcome.feedbackMemory.updated).toBe(true);
    expect(decomposition.activeCalibrationRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceOutcome: 'DRIFT',
          rule: expect.stringContaining('Không mở rộng kiến trúc'),
        }),
      ])
    );
  });

  test('returns a Socratic architecture critique contract', async ({ request }) => {
    const response = await request.post('/api/v1/agent/socratic-decision', {
      headers: { ...agentHeaders, 'x-agent-id': 'architect-agent' },
      data: {
        dilemma: 'Có nên dựng microservices cho MVP chưa có traffic?',
        context: { goal: 'Ship MVP trong 30 ngày' },
      },
    });
    const body = await response.json();

    expect(response.ok()).toBe(true);
    expect(body.contractVersion).toBe('agent.v1');
    expect(body.agentId).toBe('architect-agent');
    expect(body.tradeOffsAndRisks).toBeTruthy();
    expect(body.alternativesEvaluated.length).toBeGreaterThan(0);
  });

  test('returns three predictive horizon paths and risk data', async ({ request }) => {
    const response = await request.post('/api/v1/agent/predict', {
      headers: agentHeaders,
      data: {
        context: {
          title: 'Ship MVP SaaS',
          currentFriction: 'Chưa rõ bước triển khai đầu tiên',
          energyLevel: 'medium',
        },
      },
    });
    const body = await response.json();
    const pathTypes = body.timelines.map((timeline: { pathType: string }) => timeline.pathType).sort();

    expect(response.ok()).toBe(true);
    expect(body.contractVersion).toBe('agent.v1');
    expect(body.predictionId).toBeTruthy();
    expect(pathTypes).toEqual(['bottleneck', 'drift', 'optimal']);
    expect(body.riskMatrix.length).toBeGreaterThan(0);
    expect(body.bottlenecks.length).toBeGreaterThan(0);
  });

  test('validates required fields for decision and prediction', async ({ request }) => {
    const [decisionResponse, predictionResponse] = await Promise.all([
      request.post('/api/v1/agent/socratic-decision', { headers: agentHeaders, data: {} }),
      request.post('/api/v1/agent/predict', { headers: agentHeaders, data: { context: {} } }),
    ]);

    expect(decisionResponse.status()).toBe(400);
    expect(predictionResponse.status()).toBe(400);
  });
});