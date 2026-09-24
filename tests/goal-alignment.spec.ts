import { test, expect } from '@playwright/test';
import { calculateGoalAlignmentIndex } from '../src/goal/mod';

const now = '2026-09-24T12:00:00.000Z';

const milestone = (status: 'on_track' | 'completed', completedAt?: string) => ({
  id: 'milestone-1',
  title: 'Ship core feature',
  quarterOrMonth: 'Q3/2026',
  due: '2026-09-30T23:59:59.000Z',
  status,
  progress: status === 'completed' ? 100 : 50,
  keyDeliverable: 'Core feature works',
  ...(completedAt ? { completedAt } : {}),
});

test.describe('Goal Alignment Index', () => {
  test('increases when a milestone is completed on time', () => {
    const beforeCompletion = calculateGoalAlignmentIndex({
      goalId: 'goal-1',
      milestones: [milestone('on_track')],
      microSteps: [{ goalId: 'goal-1' }],
      now,
    });
    const afterCompletion = calculateGoalAlignmentIndex({
      goalId: 'goal-1',
      milestones: [milestone('completed', '2026-09-24T10:00:00.000Z')],
      microSteps: [{ goalId: 'goal-1' }],
      now,
    });

    expect(afterCompletion).toBeGreaterThan(beforeCompletion);
  });

  test('decreases when tasks are repeatedly added outside the goal', () => {
    const focused = calculateGoalAlignmentIndex({
      goalId: 'goal-1',
      milestones: [milestone('completed', '2026-09-24T10:00:00.000Z')],
      microSteps: [{ goalId: 'goal-1' }, { goalId: 'goal-1' }],
      now,
    });
    const withOutsideTasks = calculateGoalAlignmentIndex({
      goalId: 'goal-1',
      milestones: [milestone('completed', '2026-09-24T10:00:00.000Z')],
      microSteps: [
        { goalId: 'goal-1' },
        {},
        {},
        {},
      ],
      now,
    });

    expect(withOutsideTasks).toBeLessThan(focused);
  });

  test('resets to a non-negative baseline when the goal changes', () => {
    const afterGoalChange = calculateGoalAlignmentIndex({
      goalId: 'goal-2',
      previousGoalId: 'goal-1',
      milestones: [milestone('completed', '2026-09-24T10:00:00.000Z')],
      microSteps: [{ goalId: 'goal-2' }],
      now,
    });

    expect(afterGoalChange).toBe(0);
    expect(afterGoalChange).toBeGreaterThanOrEqual(0);
  });
});