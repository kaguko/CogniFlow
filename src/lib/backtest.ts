import { listBacktestRows } from '../db/predictions.ts';

export interface BacktestWindow {
  from: Date;
  to: Date;
  minAgeHours?: number;
}

export interface BacktestReport {
  window: { from: string; to: string };
  sampleSize: number;
  driftHitRate: number;
  crashHitRate: number;
  optimalHitRate: number;
  falseAlarmRate: number;
  falseAlarmDenominator: number;
  crashPrecision: number;
  crashRecall: number;
  byModel: Record<string, { n: number; driftHit: number; crashHit: number }>;
}

export async function runBacktest(window: BacktestWindow): Promise<BacktestReport> {
  const minAgeHours = window.minAgeHours ?? 24;
  const cutoff = new Date(Date.now() - minAgeHours * 60 * 60 * 1000);
  const rows = await listBacktestRows({ ...window, cutoff });

  if (rows.length === 0) return emptyReport(window);

  let driftHits = 0;
  let driftActual = 0;
  let crashHits = 0;
  let crashActual = 0;
  let optimalHits = 0;
  let optimalActual = 0;
  let falseAlarms = 0;
  let falseAlarmDenominator = 0;
  let crashPredicted = 0;
  const byModel: BacktestReport['byModel'] = {};

  for (const row of rows) {
    const model = row.modelVersion ?? 'unknown';
    byModel[model] ??= { n: 0, driftHit: 0, crashHit: 0 };
    byModel[model].n++;

    if (row.actualPath === 'drift') {
      driftActual++;
      if (row.predictedPath === 'drift') {
        driftHits++;
        byModel[model].driftHit++;
      }
    }
    if (row.actualPath === 'bottleneck') {
      crashActual++;
      if (row.predictedPath === 'bottleneck') {
        crashHits++;
        byModel[model].crashHit++;
      }
    }
    if (row.actualPath === 'optimal') {
      optimalActual++;
      if (row.predictedPath === 'optimal') optimalHits++;
    }
    if (row.predictedPath === 'drift' || row.predictedPath === 'bottleneck') {
      falseAlarmDenominator++;
      if (row.actualPath === 'optimal') falseAlarms++;
    }
    if (row.predictedPath === 'bottleneck') crashPredicted++;
  }

  return {
    window: { from: window.from.toISOString(), to: window.to.toISOString() },
    sampleSize: rows.length,
    driftHitRate: driftActual ? driftHits / driftActual : 0,
    crashHitRate: crashActual ? crashHits / crashActual : 0,
    optimalHitRate: optimalActual ? optimalHits / optimalActual : 0,
    falseAlarmRate: falseAlarmDenominator ? falseAlarms / falseAlarmDenominator : 0,
    falseAlarmDenominator,
    crashPrecision: crashPredicted ? crashHits / crashPredicted : 0,
    crashRecall: crashActual ? crashHits / crashActual : 0,
    byModel,
  };
}

function emptyReport(window: BacktestWindow): BacktestReport {
  return {
    window: { from: window.from.toISOString(), to: window.to.toISOString() },
    sampleSize: 0,
    driftHitRate: 0,
    crashHitRate: 0,
    optimalHitRate: 0,
    falseAlarmRate: 0,
    falseAlarmDenominator: 0,
    crashPrecision: 0,
    crashRecall: 0,
    byModel: {},
  };
}

export function assertThresholds(report: BacktestReport) {
  const failures: string[] = [];
  if (report.sampleSize < 20) failures.push(`sample too small: ${report.sampleSize}`);
  if (report.driftHitRate < 0.7) failures.push(`drift hit ${(report.driftHitRate * 100).toFixed(1)}% < 70%`);
  if (report.crashHitRate < 0.6) failures.push(`crash hit ${(report.crashHitRate * 100).toFixed(1)}% < 60%`);
  if (report.falseAlarmRate > 0.15) failures.push(`false alarm ${(report.falseAlarmRate * 100).toFixed(1)}% > 15%`);
  return { pass: failures.length === 0, failures };
}
