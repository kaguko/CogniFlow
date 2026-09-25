import autocannon from 'autocannon';

interface BenchmarkResult {
  title: string;
  connections: number;
  durationSec: number;
  reqPerSec: number;
  latencyAvgMs: number;
  latencyP50Ms: number;
  latencyP99Ms: number;
  totalRequests: number;
  errors: number;
  timeouts: number;
  non2xx: number;
}

async function runBenchmark(title: string, url: string, connections: number, duration: number): Promise<BenchmarkResult> {
  console.log(`\n===============================================================`);
  console.log(`🚀 RUNNING BENCHMARK: ${title}`);
  console.log(`   URL: ${url}`);
  console.log(`   Concurrency: ${connections} connections | Duration: ${duration}s`);
  console.log(`===============================================================`);

  return new Promise((resolve, reject) => {
    autocannon(
      {
        url,
        connections,
        duration,
        pipelining: 1,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SymFlowAge-LoadTest/1.0',
        },
      },
      (err, result) => {
        if (err) return reject(err);

        const summary: BenchmarkResult = {
          title,
          connections,
          durationSec: duration,
          reqPerSec: result.requests.average,
          latencyAvgMs: result.latency.average,
          latencyP50Ms: result.latency.p50,
          latencyP99Ms: result.latency.p99,
          totalRequests: result.requests.total,
          errors: result.errors,
          timeouts: result.timeouts,
          non2xx: result.non2xx,
        };

        console.log(`\n📊 [RESULTS] ${title}`);
        console.log(`   - Throughput: ${summary.reqPerSec.toLocaleString()} req/sec`);
        console.log(`   - Total Requests: ${summary.totalRequests.toLocaleString()}`);
        console.log(`   - Latency (Avg): ${summary.latencyAvgMs.toFixed(2)} ms`);
        console.log(`   - Latency (p50): ${summary.latencyP50Ms.toFixed(2)} ms`);
        console.log(`   - Latency (p99): ${summary.latencyP99Ms.toFixed(2)} ms`);
        console.log(`   - Socket Errors: ${summary.errors}`);
        console.log(`   - Timeouts: ${summary.timeouts}`);
        console.log(`   - Non-2xx Responses: ${summary.non2xx}`);

        resolve(summary);
      }
    );
  });
}

async function main() {
  const targetUrl = process.env.TARGET_URL || 'http://127.0.0.1:3000';
  console.log(`\n🔥 Starting SymFlowAge High-Concurrency Autocannon Suite on ${targetUrl}`);

  const results: BenchmarkResult[] = [];

  try {
    // 1. Moderate concurrency: 100 connections
    results.push(await runBenchmark('Moderate Concurrency (/api/health)', `${targetUrl}/api/health`, 100, 10));

    // 2. High concurrency: 500 connections
    results.push(await runBenchmark('High Concurrency (/api/health)', `${targetUrl}/api/health`, 500, 10));

    // 3. Peak concurrency: 1,000 connections
    results.push(await runBenchmark('Peak Concurrency (/api/health)', `${targetUrl}/api/health`, 1000, 10));

    // 4. M2M Spec load: 200 connections on /openapi.json
    results.push(await runBenchmark('OpenAPI Spec Delivery (/openapi.json)', `${targetUrl}/openapi.json`, 200, 5));

    console.log('\n===============================================================');
    console.log('🏁 LOAD TESTING SUMMARY TABLE');
    console.log('===============================================================');
    console.table(
      results.map((r) => ({
        'Scenario': r.title,
        'Connections': r.connections,
        'Req/sec': Math.round(r.reqPerSec),
        'Total Reqs': r.totalRequests,
        'Lat p50 (ms)': r.latencyP50Ms,
        'Lat p99 (ms)': r.latencyP99Ms,
        'Errors': r.errors,
        'Timeouts': r.timeouts,
      }))
    );
  } catch (error) {
    console.error('Benchmark execution error:', error);
    process.exit(1);
  }
}

main();
