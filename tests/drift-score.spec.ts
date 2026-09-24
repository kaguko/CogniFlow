import { test, expect } from '@playwright/test';

test.describe('Drift Score Engine', () => {
  test('returns zero drift for aligned steps and warns for unlinked tasks', async ({ page }) => {
    const alignedPayload = {
      goal: { title: 'Senior Backend Engineer' },
      microSteps: [
        { title: 'Viết test auth', goalId: 'g1' },
        { title: 'Fix API bug', goalId: 'g1' },
      ],
    };

    const driftPayload = {
      goal: { title: 'Senior Backend Engineer' },
      microSteps: [
        { title: 'Viết test auth', goalId: 'g1' },
        { title: 'Màu sắc UI', isAlignedWithGoal: false },
        { title: 'Fix API bug' },
      ],
    };

    await page.goto('/');

    const alignedResult = await page.evaluate(async (payload) => {
      const res = await fetch('http://127.0.0.1:3000/api/goals/check-drift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.json();
    }, alignedPayload);

    const driftResult = await page.evaluate(async (payload) => {
      const res = await fetch('http://127.0.0.1:3000/api/goals/check-drift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.json();
    }, driftPayload);

    expect(alignedResult.driftScore).toBe(0);
    expect(alignedResult.hasWarning).toBe(false);
    expect(alignedResult.recommendation).toContain('Tất cả');

    expect(driftResult.driftScore).toBeGreaterThan(0);
    expect(driftResult.hasWarning).toBe(true);
    expect(driftResult.unlinkedStepsCount).toBeGreaterThan(0);
    expect(driftResult.recommendation).toContain('mục tiêu dài hạn');
  });
});
