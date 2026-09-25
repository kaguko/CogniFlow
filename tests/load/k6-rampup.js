import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics for analyzing breaking point
export const successfulRequests = new Counter('successful_requests');
export const rateLimitedRequests = new Counter('rate_limited_429');
export const serverErrorRequests = new Counter('server_errors_5xx');
export const errorRate = new Rate('error_rate');
export const healthDuration = new Trend('health_duration_ms');
export const m2mApiDuration = new Trend('m2m_api_duration_ms');

// Execution Strategy: Ramp-up Test (100 -> 1,000 -> 5,000 -> 10,000 Virtual Users)
export const options = {
  stages: [
    { duration: '5s', target: 100 },    // Ramp up to 100 concurrent users
    { duration: '10s', target: 500 },   // Step up to 500 concurrent users
    { duration: '15s', target: 1000 },  // Ramp up to 1,000 concurrent users
    { duration: '20s', target: 3000 },  // Push towards peak load (3,000 - 5,000)
    { duration: '15s', target: 5000 },  // Hold at high load to detect breaking point
    { duration: '10s', target: 100 },   // Ramp down to observe recovery
    { duration: '5s', target: 0 },      // Graceful teardown
  ],
  thresholds: {
    // 95% of successful requests should be under 500ms
    'http_req_duration{status:200}': ['p(95)<500'],
    // 5xx Fatal Server Errors should be close to 0 (system must degrade gracefully via 429 instead of 500)
    'server_errors_5xx': ['count<50'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:3000';

export default function () {
  const vuId = __VU;
  const iteration = __ITER;

  // 1. Test lightweight health check endpoint
  {
    const res = http.get(`${BASE_URL}/api/health`, {
      headers: { 'Accept': 'application/json' },
      tags: { endpoint: 'health' },
    });

    healthDuration.add(res.timings.duration);

    const isOk = check(res, {
      'health status is 200': (r) => r.status === 200,
      'health reports healthy': (r) => {
        try {
          return JSON.parse(r.body).status === 'healthy';
        } catch (_) {
          return false;
        }
      },
    });

    if (res.status === 200) {
      successfulRequests.add(1);
    } else if (res.status === 429) {
      rateLimitedRequests.add(1);
    } else if (res.status >= 500) {
      serverErrorRequests.add(1);
      errorRate.add(1);
    }
  }

  // 2. Test M2M Telemetry & Calibration Rules endpoint
  {
    const res = http.get(`${BASE_URL}/api/agent/calibration-rules`, {
      headers: { 'Accept': 'application/json' },
      tags: { endpoint: 'calibration_rules' },
    });

    check(res, {
      'calibration status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    });

    if (res.status === 200) {
      successfulRequests.add(1);
    } else if (res.status === 429) {
      rateLimitedRequests.add(1);
    } else if (res.status >= 500) {
      serverErrorRequests.add(1);
      errorRate.add(1);
    }
  }

  // 3. Test Circuit Breaker Config probe
  {
    const res = http.get(`${BASE_URL}/api/circuit-breaker/config`, {
      headers: { 'Accept': 'application/json' },
      tags: { endpoint: 'circuit_breaker_config' },
    });

    check(res, {
      'circuit breaker config accessible': (r) => r.status === 200 || r.status === 429,
    });

    if (res.status === 200) {
      successfulRequests.add(1);
    } else if (res.status === 429) {
      rateLimitedRequests.add(1);
    }
  }

  // Jitter sleep between 10ms - 50ms to simulate real client typing / polling
  sleep(0.02);
}
