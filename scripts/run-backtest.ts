import { assertThresholds, runBacktest } from '../src/lib/backtest.ts';

const to = new Date();
const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

try {
  const report = await runBacktest({ from, to, minAgeHours: 1 });
  console.log(JSON.stringify(report, null, 2));

  const verdict = assertThresholds(report);
  console.log('\nVerdict:', verdict.pass ? 'PASS' : 'FAIL');
  if (!verdict.pass) {
    verdict.failures.forEach((failure) => console.log(`  - ${failure}`));
    process.exitCode = 1;
  }
} catch (error) {
  console.error('Backtest failed:', error);
  process.exitCode = 1;
}