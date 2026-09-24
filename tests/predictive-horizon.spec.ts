import { test, expect } from '@playwright/test';
import { backtestPredictiveHorizon } from '../src/prediction/backtesting';
import type { FutureTimeline, PathType } from '../src/prediction/valueObjects';

const recordedAt = '2026-09-24T08:00:00.000Z';

function timeline(pathType: PathType, probability: number): FutureTimeline {
  return {
    id: pathType,
    name: pathType,
    pathType,
    probability,
    summary: pathType,
    milestones: [],
    consequence: pathType,
  };
}

function prediction(predictedPath: PathType) {
  const probabilities: Record<PathType, number> = {
    optimal: predictedPath === 'optimal' ? 70 : 10,
    drift: predictedPath === 'drift' ? 70 : 20,
    bottleneck: predictedPath === 'bottleneck' ? 70 : 10,
  };

  return {
    recordedAt,
    timelines: (Object.keys(probabilities) as PathType[]).map((path) => timeline(path, probabilities[path])),
  };
}

function backtestCase(predictedPath: PathType, actualPath: PathType, observedAt = '2026-09-24T10:00:00.000Z') {
  return {
    prediction: prediction(predictedPath),
    outcome: { observedAt, path: actualPath },
  };
}

test('predictive horizon backtest meets buffered thresholds across 20 cases per path', () => {
  const cases = [
    ...Array.from({ length: 15 }, () => backtestCase('drift', 'drift')),
    ...Array.from({ length: 5 }, () => backtestCase('optimal', 'drift')),
    ...Array.from({ length: 14 }, () => backtestCase('bottleneck', 'bottleneck', '2026-09-25T08:00:00.000Z')),
    ...Array.from({ length: 6 }, () => backtestCase('optimal', 'bottleneck', '2026-09-25T08:00:00.000Z')),
    ...Array.from({ length: 18 }, () => backtestCase('optimal', 'optimal')),
    ...Array.from({ length: 2 }, () => backtestCase('bottleneck', 'optimal', '2026-09-25T08:00:00.000Z')),
    backtestCase('optimal', 'drift', '2026-09-25T09:00:00.000Z'),
  ];

  const metrics = backtestPredictiveHorizon(cases);

  expect(metrics.evaluatedCases).toBe(60);
  expect(metrics.driftPathHitRate).toBeGreaterThanOrEqual(0.7);
  expect(metrics.crashPathHitRate).toBeGreaterThanOrEqual(0.6);
  expect(metrics.falseAlarmRate).toBeLessThanOrEqual(0.15);
});

test('predictive horizon backtest ignores malformed and empty observations', () => {
  const validCase = backtestCase('drift', 'drift');
  const metrics = backtestPredictiveHorizon([
    validCase,
    { ...validCase, prediction: { ...validCase.prediction, recordedAt: 'invalid' } },
    { ...validCase, outcome: { ...validCase.outcome, observedAt: 'invalid' } },
    { ...validCase, prediction: { ...validCase.prediction, timelines: [] } },
  ]);

  expect(metrics.evaluatedCases).toBe(2);
  expect(metrics.driftPathHitRate).toBe(0.5);
  expect(metrics.crashPathHitRate).toBe(0);
  expect(metrics.falseAlarmRate).toBe(0);
});