import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics for Spike Test
export const spikeSuccess = new Counter('spike_success_200');
export const spikeRateLimited = new Counter('spike_rate_limited_429');
export const spikeServerError = new Counter('spike_server_error_5xx');
export const spikeFailRate = new Rate('spike_failure_rate');
export const spikeLatency = new Trend('spike_latency_ms');

// Execution Strategy: Spike Test
// Instantly blast thousands of concurrent requests in 1 second, sustain briefly, then observe system resilience.
export const options = {
  stages: [
    { duration: '3s', target: 20 },     // Baseline calm traffic (20 VUs)
    { duration: '1s', target: 2000 },   // SPIKE! Instant explosion to 2,000 VUs in 1 second
    { duration: '10s', target: 2000 },  // Hold the tsunami spike to test backpressure & memory limits
    { duration: '3s', target: 50 },     // Instant drop back to normal traffic
    { duration: '5s', target: 50 },     // Verify server is alive and responding normally after spike
    { duration: '2s', target: 0 },      // Ramp down
  ],
  thresholds: {
    // Zero process crash: 5xx server errors must remain negligible
    'spike_server_error_5xx': ['count<20'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:3000';

export default function () {
  const res = http.get(`${BASE_URL}/api/health`, {
    headers: { 'Accept': 'application/json' },
    tags: { type: 'spike_burst' },
  });

  spikeLatency.add(res.timings.duration);

  const passed = check(res, {
    'response status is either 200 (served) or 429 (rate protected)': (r) =>
      r.status === 200 || r.status === 429,
    'server did not crash with 5xx': (r) => r.status < 500,
  });

  if (res.status === 200) {
    spikeSuccess.add(1);
  } else if (res.status === 429) {
    spikeRateLimited.add(1);
  } else if (res.status >= 500) {
    spikeServerError.add(1);
    spikeFailRate.add(1);
  }
}
