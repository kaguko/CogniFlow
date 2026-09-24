import { test, expect } from '@playwright/test';
import { calculateDriftStatus } from '../src/goal/mod';

const alignedTasks = [
  'Implement authentication in Python FastAPI',
  'Fix Spring Boot token refresh',
  'Add Rust parser tests',
  'Build Flutter onboarding screen',
  'Write Go queue integration test',
  'Update Django user migration',
  'Add React form validation',
  'Tune PostgreSQL query plan',
  'Create Android deep link handler',
  'Document Kafka retry behavior',
  'Implement Swift settings flow',
  'Add Ruby request specs',
];

const unlinkedTasks = [
  'Redesign unrelated landing page colors',
  'Research a new framework for no reason',
  'Polish a logo before the core flow works',
  'Rewrite the build system during bug fixing',
  'Compare five icon libraries for one button',
  'Add an unrelated admin dashboard animation',
  'Prototype a second database without a requirement',
  'Tune a microsecond benchmark with no traffic',
  'Create a side project task during the release',
  'Rewrite stable code in another language',
  'Add speculative multi-region deployment',
  'Explore a new cache before measuring a bottleneck',
];

test.describe('Drift Score golden dataset', () => {
  test('keeps 36 multilingual and cross-domain tasks within the structural drift contract', () => {
    const steps = [
      ...alignedTasks.map((title, index) => ({ title, goalId: `goal-${index % 3}` })),
      ...alignedTasks.map((title, index) => ({ title: `${title} aligned`, isAlignedWithGoal: true })),
      ...unlinkedTasks.map((title) => ({ title })),
    ];

    const result = calculateDriftStatus(
      { title: 'Ship the core product' } as Parameters<typeof calculateDriftStatus>[0],
      steps
    );

    expect(steps).toHaveLength(36);
    expect(result.unlinkedStepsCount).toBe(12);
    expect(result.driftScore).toBe(33);
    expect(result.hasWarning).toBe(true);
  });

  test('returns no drift for empty and explicitly aligned datasets', () => {
    const result = calculateDriftStatus(
      { title: 'Ship the core product' } as Parameters<typeof calculateDriftStatus>[0],
      [{ goalId: 'goal-1' }, { isAlignedWithGoal: true }]
    );

    expect(result.driftScore).toBe(0);
    expect(result.unlinkedStepsCount).toBe(0);
    expect(result.hasWarning).toBe(false);
  });
});