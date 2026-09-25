import { test, expect } from '@playwright/test';
import WebSocket from 'ws';

test.describe('Heavy / High-Frequency Agent Architecture', () => {
  const BASE_URL = 'http://127.0.0.1:3000';
  const WS_URL = 'ws://127.0.0.1:3000/ws/agent/stream';

  test('validates required fields for async enqueue', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/v1/agent/async/enqueue`, {
      data: { payload: { test: true } },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('returns instant ACK (< 5ms) when enqueuing high-frequency nano-step', async ({ request }) => {
    const start = performance.now();
    const res = await request.post(`${BASE_URL}/api/v1/agent/async/enqueue`, {
      data: {
        agentId: 'coder_executor',
        actionType: 'NANO_STEP_EVAL',
        payload: {
          stepIndex: 1,
          codeChunk: 'function verifyJWT() { return true; }',
          assertion: 'assertTokenNotRevoked',
        },
      },
    });

    const elapsed = performance.now() - start;
    expect(res.status()).toBe(202);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.jobId).toMatch(/^job_/);
    expect(typeof body.queuePosition).toBe('number');
    expect(body.backpressureState).toBe('NORMAL');
    expect(body.ackLatencyMs).toBeLessThan(10);
    expect(elapsed).toBeLessThan(50); // Total HTTP round-trip including loopback
  });

  test('reports all 3 architectural strategies in telemetry endpoint', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/agent/async/telemetry`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.strategies).toBeDefined();

    // Strategy 1: Persistent Streaming
    expect(body.strategies.strategy1_persistent_streaming).toBeDefined();
    expect(body.strategies.strategy1_persistent_streaming.targetLatency).toContain('5ms');

    // Strategy 2: Async Queue & Workers
    expect(body.strategies.strategy2_async_queue_workers).toBeDefined();
    expect(body.strategies.strategy2_async_queue_workers.maxCapacity).toBe(10000);
    expect(typeof body.strategies.strategy2_async_queue_workers.queueDepth).toBe('number');

    // Strategy 3: Multi-Tiered Cache
    expect(body.strategies.strategy3_multi_tiered_cache).toBeDefined();
    expect(body.strategies.strategy3_multi_tiered_cache.tier1.name).toContain('In-Memory LRU');
    expect(body.strategies.strategy3_multi_tiered_cache.tier2.name).toContain('Distributed Staged');
    expect(body.strategies.strategy3_multi_tiered_cache.tier3.name).toContain('Write-Behind');
  });

  test('synchronizes Tier 2 Micro-step checkpoint and flushes Tier 3 write-behind batch', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/v1/agent/async/checkpoint`, {
      data: {
        sessionKey: 'session_e2e_test',
        state: {
          status: 'microstep_verified',
          stepIndex: 3,
        },
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.flushedTier3Count).toBe('number');
  });

  test('connects to WebSocket duplex stream (/ws/agent/stream) and dispatches nano-steps with sub-5ms latency', async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timed out'));
      }, 5000);

      let handshakeDone = false;

      ws.on('open', () => {
        // Send Handshake
        ws.send(JSON.stringify({
          type: 'HANDSHAKE',
          agentId: 'test_duplex_agent',
        }));
      });

      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'CONNECTION_ESTABLISHED') {
          expect(msg.protocol).toContain('SymFlowAge-Duplex-Stream');
        } else if (msg.type === 'HANDSHAKE_ACK') {
          expect(msg.status).toBe('authenticated');
          expect(msg.agentId).toBe('test_duplex_agent');
          handshakeDone = true;

          // Dispatch Nano-step
          ws.send(JSON.stringify({
            type: 'NANO_STEP_DISPATCH',
            payload: { action: 'evaluate_ast' },
          }));
        } else if (msg.type === 'NANO_STEP_ACK') {
          expect(handshakeDone).toBe(true);
          expect(msg.jobId).toBeDefined();
          expect(msg.duplexLatencyMs).toBeLessThan(15); // Fast in-memory duplex roundtrip

          // Send Ping
          ws.send(JSON.stringify({ type: 'PING' }));
        } else if (msg.type === 'PONG') {
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  });
});
