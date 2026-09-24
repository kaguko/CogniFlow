import type { FutureTimeline, PathType } from './valueObjects';

export interface PredictionSnapshot {
  recordedAt: string;
  timelines: FutureTimeline[];
}

export interface ObservedPredictionOutcome {
  observedAt: string;
  path: PathType;
}

export interface PredictionBacktestCase {
  prediction: PredictionSnapshot;
  outcome: ObservedPredictionOutcome;
}

export interface PredictiveHorizonMetrics {
  evaluatedCases: number;
  driftPathHitRate: number;
  crashPathHitRate: number;
  falseAlarmRate: number;
}

function selectPredictedPath(timelines: FutureTimeline[]): PathType | null {
  if (timelines.length === 0) return null;

  const highestProbabilityTimeline = timelines.reduce((highest, timeline) =>
    timeline.probability > highest.probability ? timeline : highest
  );
  return highestProbabilityTimeline.pathType;
}

function isWithinHorizon(prediction: PredictionSnapshot, outcome: ObservedPredictionOutcome, horizonHours: number) {
  const recordedAt = Date.parse(prediction.recordedAt);
  const observedAt = Date.parse(outcome.observedAt);
  if (!Number.isFinite(recordedAt) || !Number.isFinite(observedAt) || horizonHours < 0) return false;
  const horizonEnd = recordedAt + horizonHours * 60 * 60 * 1000;
  return observedAt >= recordedAt && observedAt <= horizonEnd;
}

export function backtestPredictiveHorizon(
  cases: PredictionBacktestCase[],
  horizonHours = 24
): PredictiveHorizonMetrics {
  const evaluatedCases = cases.filter(({ prediction, outcome }) =>
    isWithinHorizon(prediction, outcome, horizonHours)
  );
  const predictions = evaluatedCases.map(({ prediction, outcome }) => ({
    predictedPath: selectPredictedPath(prediction.timelines),
    actualPath: outcome.path,
  }));

  const actualDriftCount = predictions.filter(({ actualPath }) => actualPath === 'drift').length;
  const actualCrashCount = predictions.filter(({ actualPath }) => actualPath === 'bottleneck').length;
  const predictedCrash = predictions.filter(({ predictedPath }) => predictedPath === 'bottleneck');
  const crashFalseAlarms = predictedCrash.filter(({ actualPath }) => actualPath !== 'bottleneck').length;

  return {
    evaluatedCases: predictions.length,
    driftPathHitRate: actualDriftCount === 0
      ? 0
      : predictions.filter(({ predictedPath, actualPath }) => predictedPath === 'drift' && actualPath === 'drift').length / actualDriftCount,
    crashPathHitRate: actualCrashCount === 0
      ? 0
      : predictions.filter(({ predictedPath, actualPath }) => predictedPath === 'bottleneck' && actualPath === 'bottleneck').length / actualCrashCount,
    falseAlarmRate: predictedCrash.length === 0 ? 0 : crashFalseAlarms / predictedCrash.length,
  };
}