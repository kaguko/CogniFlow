import WebSocket from 'ws';

interface HeavyBenchmarkSummary {
  protocol: string;
  totalNanoSteps: number;
  durationMs: number;
  throughputPerSec: number;
  averageLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  successCount: number;
  errorCount: number;
}

const TARGET_HTTP = process.env.TARGET_HTTP || 'http://127.0.0.1:3000';
const TARGET_WS = process.env.TARGET_WS || 'ws://127.0.0.1:3000/ws/agent/stream';

async function benchmarkAsyncHttpQueue(totalRequests: number): Promise<HeavyBenchmarkSummary> {
  console.log(`\n===============================================================`);
  console.log(`🚀 STRATEGY 2: High-Frequency Async Enqueue Benchmark (HTTP REST)`);
  console.log(`   Target: ${TARGET_HTTP}/api/v1/agent/async/enqueue`);
  console.log(`   Total Nano-Steps: ${totalRequests.toLocaleString()}`);
  console.log(`===============================================================`);

  const latencies: number[] = [];
  let successCount = 0;
  let errorCount = 0;
  const start = performance.now();

  const batchSize = 50;
  for (let i = 0; i < totalRequests; i += batchSize) {
    const promises = [];
    for (let j = 0; j < batchSize && i + j < totalRequests; j++) {
      const stepIdx = i + j;
      const reqStart = performance.now();

      promises.push(
        fetch(`${TARGET_HTTP}/api/v1/agent/async/enqueue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: 'coder_heavy_agent',
            actionType: 'NANO_STEP_EVAL',
            payload: { step: stepIdx, code: `function step_${stepIdx}() {}` },
          }),
        })
          .then(async (res) => {
            const duration = performance.now() - reqStart;
            latencies.push(duration);
            if (res.status === 202) successCount++;
            else errorCount++;
          })
          .catch(() => errorCount++)
      );
    }
    await Promise.all(promises);
  }

  const durationMs = performance.now() - start;
  const throughput = Math.round((successCount / (durationMs / 1000)) * 10) / 10;
  const avg = Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 100) / 100;
  const min = Math.round(Math.min(...latencies) * 100) / 100;
  const max = Math.round(Math.max(...latencies) * 100) / 100;

  console.log(`   - Throughput: ${throughput} nano-steps/sec (Instant ACKs)`);
  console.log(`   - Avg Latency: ${avg} ms | Min: ${min} ms | Max: ${max} ms`);
  console.log(`   - Success: ${successCount} | Errors: ${errorCount}`);

  return {
    protocol: 'Async HTTP Enqueue (< 2ms ACK)',
    totalNanoSteps: totalRequests,
    durationMs: Math.round(durationMs),
    throughputPerSec: throughput,
    averageLatencyMs: avg,
    minLatencyMs: min,
    maxLatencyMs: max,
    successCount,
    errorCount,
  };
}

async function benchmarkWebSocketDuplex(totalMessages: number): Promise<HeavyBenchmarkSummary> {
  console.log(`\n===============================================================`);
  console.log(`⚡ STRATEGY 1: WebSocket Duplex Streaming Benchmark`);
  console.log(`   Target: ${TARGET_WS}`);
  console.log(`   Total Nano-Steps: ${totalMessages.toLocaleString()}`);
  console.log(`===============================================================`);

  return new Promise((resolve) => {
    const ws = new WebSocket(TARGET_WS);
    const latencies: number[] = [];
    let sentCount = 0;
    let receivedAcks = 0;
    let errors = 0;
    let startTime = 0;
    const sentTimestamps = new Map<number, number>();

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'HANDSHAKE', agentId: 'benchmark_duplex_agent' }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'HANDSHAKE_ACK') {
        startTime = performance.now();

        // Stream messages continuously over hot socket
        for (let i = 0; i < totalMessages; i++) {
          sentTimestamps.set(i, performance.now());
          ws.send(
            JSON.stringify({
              type: 'NANO_STEP_DISPATCH',
              stepIndex: i,
              payload: { ast_check: true, token_id: i },
            })
          );
          sentCount++;
        }
      } else if (msg.type === 'NANO_STEP_ACK') {
        const receivedAt = performance.now();
        const sentAt = sentTimestamps.get(receivedAcks);
        if (sentAt) {
          latencies.push(receivedAt - sentAt);
        }
        receivedAcks++;

        if (receivedAcks >= totalMessages) {
          const durationMs = performance.now() - startTime;
          const throughput = Math.round((receivedAcks / (durationMs / 1000)) * 10) / 10;
          const avg = Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 100) / 100;
          const min = Math.round(Math.min(...latencies) * 100) / 100;
          const max = Math.round(Math.max(...latencies) * 100) / 100;

          console.log(`   - Throughput: ${throughput} duplex steps/sec`);
          console.log(`   - Avg Roundtrip: ${avg} ms | Min: ${min} ms | Max: ${max} ms`);
          console.log(`   - Received ACKs: ${receivedAcks}`);

          ws.close();
          resolve({
            protocol: 'WebSocket Duplex (< 5ms stream)',
            totalNanoSteps: totalMessages,
            durationMs: Math.round(durationMs),
            throughputPerSec: throughput,
            averageLatencyMs: avg,
            minLatencyMs: min,
            maxLatencyMs: max,
            successCount: receivedAcks,
            errorCount: errors,
          });
        }
      }
    });

    ws.on('error', () => {
      errors++;
      ws.close();
      resolve({
        protocol: 'WebSocket Duplex (< 5ms stream)',
        totalNanoSteps: totalMessages,
        durationMs: 0,
        throughputPerSec: 0,
        averageLatencyMs: 0,
        minLatencyMs: 0,
        maxLatencyMs: 0,
        successCount: receivedAcks,
        errorCount: errors || 1,
      });
    });
  });
}

async function main() {
  console.log(`\n===============================================================`);
  console.log(`🔥 SYMFLOWAGE HEAVY / HIGH-FREQUENCY AGENT BENCHMARK SUITE`);
  console.log(`===============================================================`);

  const results: HeavyBenchmarkSummary[] = [];

  try {
    // 1. Benchmark Async HTTP Enqueue (500 steps)
    results.push(await benchmarkAsyncHttpQueue(500));

    // 2. Benchmark WebSocket Duplex Streaming (500 steps)
    results.push(await benchmarkWebSocketDuplex(500));

    console.log('\n===============================================================');
    console.log('🏁 HEAVY AGENT PERFORMANCE COMPARISON TABLE');
    console.log('===============================================================');
    console.table(
      results.map((r) => ({
        Strategy: r.protocol,
        'Nano-Steps': r.totalNanoSteps,
        'Duration (ms)': r.durationMs,
        'Throughput (steps/sec)': r.throughputPerSec,
        'Avg Latency (ms)': r.averageLatencyMs,
        'Min Latency (ms)': r.minLatencyMs,
        'Max Latency (ms)': r.maxLatencyMs,
        Success: r.successCount,
      }))
    );
  } catch (err) {
    console.error('Benchmark execution error:', err);
    process.exit(1);
  }
}

main();
