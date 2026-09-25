import { test, expect } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:3000';
const mcpHeaders = {
  Authorization: 'Bearer test-agent-key',
};

test.describe('MCP SSE transport', () => {
  test('requires M2M credentials', async ({ request }) => {
    const response = await request.get('/api/mcp/sse');

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: 'invalid_agent_credentials' });
  });

  test('opens an authenticated SSE session and publishes its message endpoint', async () => {
    const controller = new AbortController();
    const response = await fetch(`${baseUrl}/api/mcp/sse`, {
      headers: mcpHeaders,
      signal: controller.signal,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const reader = response.body?.getReader();
    expect(reader).toBeTruthy();

    const firstChunk = await reader!.read();
    const payload = new TextDecoder().decode(firstChunk.value);
    expect(payload).toMatch(/event: endpoint/);
    expect(payload).toMatch(/\/api\/mcp\/messages\?sessionId=/);

    await reader!.cancel();
    controller.abort();
  });

  test('publishes HALT_EXECUTION when the agent drifts into a technical rabbit hole', async () => {
    const controller = new AbortController();
    const response = await fetch(`${baseUrl}/api/mcp/sse`, {
      headers: mcpHeaders,
      signal: controller.signal,
    });
    const reader = response.body!.getReader();
    await reader.read();

    const alertRead = reader.read();
    const guardrailResponse = await fetch(`${baseUrl}/api/v1/agent/guardrail/drift-check`, {
      method: 'POST',
      headers: {
        ...mcpHeaders,
        'Content-Type': 'application/json',
        'x-agent-id': 'mcp-sse-circuit-breaker-test',
      },
      body: JSON.stringify({
        originalGoal: 'Launch MVP SaaS với OAuth2',
        agentOutput: 'Tự viết lại toàn bộ UI component framework và thư viện CSS từ đầu',
        circuitBreakerThreshold: 40,
      }),
    });

    expect(guardrailResponse.status).toBe(200);
    expect((await guardrailResponse.json()).decision).toBe('BLOCK');

    const alertChunk = await Promise.race([
      alertRead,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timed out waiting for HALT_EXECUTION')), 3000)),
    ]);
    const alertPayload = new TextDecoder().decode(alertChunk.value);
    const dataLine = alertPayload.split('\n').find((line) => line.startsWith('data: '));
    const alertData = JSON.parse(dataLine!.slice('data: '.length));

    expect(alertPayload).toContain('event: guardrail_alert');
    expect(alertData.action).toBe('HALT_EXECUTION');
    expect(alertData.circuitStatus).toBe('OPEN');
    expect(alertData.driftScore).toBeGreaterThanOrEqual(40);

    await reader.cancel();
    controller.abort();
  });

  test('feeds MCP outcome feedback into the next MCP decomposition', async ({ request }) => {
    const outcomeResponse = await request.post('/api/mcp', {
      headers: mcpHeaders,
      data: {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'symflowage_report_outcome',
          arguments: {
            requestId: `mcp-self-improvement-${Date.now()}`,
            outcomeStatus: 'DRIFT',
            actualDriftScore: 60,
            notes: 'MCP phải chạy test contract trước khi mở rộng kiến trúc.',
          },
        },
      },
    });
    const outcome = await outcomeResponse.json();
    const outcomeText = JSON.parse(outcome.result.content[0].text);

    const decompositionResponse = await request.post('/api/mcp', {
      headers: mcpHeaders,
      data: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'symflowage_decompose_task',
          arguments: {
            taskTitle: 'Cải thiện vòng lặp MCP',
            goalTitle: 'Tự cải thiện SymFlowAge',
          },
        },
      },
    });
    const decomposition = await decompositionResponse.json();
    const decompositionText = JSON.parse(decomposition.result.content[0].text);

    expect(outcomeResponse.ok()).toBe(true);
    expect(outcomeText.feedbackMemory.updated).toBe(true);
    expect(decompositionResponse.ok()).toBe(true);
    expect(decompositionText.activeCalibrationRules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceOutcome: 'DRIFT',
          rule: expect.stringContaining('MCP phải chạy test contract'),
        }),
      ])
    );
  });
});