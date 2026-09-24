import { test, expect } from '@playwright/test';

test.describe('Rabbit Hole Detector', () => {
  test('detects true rabbit holes and avoids false positives with precision/recall close to 1.0', async ({ page }) => {
    const payload = {
      coreGoalTitle: 'Ship MVP SaaS trong 30 ngày',
      coreGoalVision: 'Ra mắt phiên bản đầu tiên có khách hàng sử dụng',
      tasks: [
        { id: 'rp_1', title: 'Thiết kế Kafka + microservice + Kubernetes cho MVP' },
        { id: 'rp_2', title: 'Tối ưu microsecond latency trước khi có traffic thực tế' },
        { id: 'rp_3', title: 'Viết lại custom auth framework từ đầu thay vì dùng Firebase Auth' },
        { id: 'fp_1', title: 'Triển khai login bằng Firebase Auth chuẩn' },
        { id: 'fp_2', title: 'Khởi tạo lộ trình CRUD cho user profile' },
      ],
      userExemptions: [
        { taskId: 'fp_1', taskTitle: 'Triển khai login bằng Firebase Auth chuẩn', reason: 'Bảo mật và chuẩn hóa cho MVP' },
      ],
    };

    await page.goto('/');

    const result = await page.evaluate(async (body) => {
      const response = await fetch('http://127.0.0.1:3000/api/semantic-drift-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return response.json();
    }, payload);

    const detected = result.detectedRabbitHoles || [];
    const detectedIds = detected.map((item: any) => item.taskId);

    expect(detectedIds).toContain('rp_1');
    expect(detectedIds).toContain('rp_2');
    expect(detectedIds).toContain('rp_3');
    expect(detectedIds).not.toContain('fp_1');
    expect(detectedIds).not.toContain('fp_2');

    const truePositiveCount = 3;
    const predictedPositiveCount = detected.length;
    const precision = predictedPositiveCount === 0 ? 0 : truePositiveCount / predictedPositiveCount;
    const recall = truePositiveCount / 3;

    expect(predictedPositiveCount).toBe(3);
    expect(precision).toBe(1);
    expect(recall).toBe(1);
    expect(result.overallAlignmentPercent).toBeLessThan(100);
    expect(result.contractVersion).toBe('semantic-drift.v1');
    expect(result.decision).toBe('BLOCK');
    expect(result.driftScore).toBeGreaterThanOrEqual(40);
    expect(result.summaryAnalysis).toContain('Rabbit Hole');
  });

  test('rejects malformed task lists instead of silently treating them as aligned', async ({ page }) => {
    await page.goto('/');

    const response = await page.evaluate(async () => {
      const result = await fetch('http://127.0.0.1:3000/api/semantic-drift-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coreGoalTitle: 'Ship MVP', tasks: [{ id: 'broken' }] }),
      });
      return { status: result.status, body: await result.json() };
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('every task must contain');
  });
});
