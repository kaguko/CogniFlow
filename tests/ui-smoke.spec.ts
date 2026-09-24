import { test, expect } from '@playwright/test';

test.describe('SymFlowAge UI smoke tests', () => {
  test('loads the app shell and visible navigation', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('SymFlowAge', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tái Dự Báo AI/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mục Tiêu Dài Hạn', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vi Bước Lập Trình', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Điểm Nghẽn & Rủi Ro', exact: true })).toBeVisible();
  });

  test('switches tabs and toggles focus mode', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Mục Tiêu Dài Hạn', exact: true }).click();
    await expect(page.getByText(/Mục Tiêu Dài Hạn|Goal Canvas/i).first()).toBeVisible();

    await page.getByRole('button', { name: 'Vi Bước Lập Trình', exact: true }).click();
    await expect(page.getByText(/Vi Bước Lập Trình/i).first()).toBeVisible();

    await page.keyboard.press('Shift+F');
    await expect(page.getByText(/CHẾ ĐỘ TẬP TRUNG TUYỆT ĐỐI/i)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByText(/CHẾ ĐỘ TẬP TRUNG TUYỆT ĐỐI/i)).not.toBeVisible();
  });

  test('opens keyboard cheat sheet modal', async ({ page }) => {
    await page.goto('/');

    await page.locator('[title="Bảng phím tắt (Bấm Shift + ?)"]').click();
    await expect(page.getByText(/PHÍM TẮT HỆ THỐNG GLOBAL/i)).toBeVisible();

    await page.getByRole('button', { name: /Đã Hiểu/i }).click();
    await expect(page.getByText(/PHÍM TẮT HỆ THỐNG GLOBAL/i)).not.toBeVisible();
  });

  test('opens the goal planner and creates a goal', async ({ page }) => {
    await page.route('**/api/goals/plan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'goal_ui_test_1',
          title: 'Senior Backend Engineer',
          vision: 'Ship production-grade backend systems',
          horizon: '12_months',
          deadline: '12 tháng tới',
          milestones: [
            {
              id: 'ms_ui_1',
              title: 'Q1: Nền tảng backend',
              quarterOrMonth: 'Q1 (Tháng 1-3)',
              due: '3 tháng tới',
              status: 'on_track',
              progress: 10,
              keyDeliverable: 'Xây dựng shipping-ready backend foundation',
              dependencies: ['Cam kết tối thiểu 8h/tuần'],
            },
          ],
          constraints: {
            hoursPerWeek: 10,
            budget: 500,
            primarySkills: ['Node.js', 'System Design'],
            priority: 'critical',
          },
          immediateMicroSteps: [
            {
              id: 'step_ui_1',
              order: 1,
              title: 'Viết 1 test auth cơ bản',
              durationMinutes: 10,
              programmerPrinciple: 'TDD Loop',
              inputRequired: 'Mục tiêu test auth',
              singleAction: 'Thêm 1 test case auth',
              testCriterion: 'Test chạy pass',
              unblockTip: 'Xem lại contract API',
              completed: false,
              goalTitle: 'Senior Backend Engineer',
              milestoneTitle: 'Q1: Nền tảng backend',
              isAlignedWithGoal: true,
            },
          ],
        }),
      });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Mục Tiêu Dài Hạn', exact: true }).click();
    await page.getByRole('button', { name: /Lập Mục Tiêu AI \(Planner\)/i }).click();

    await page.getByPlaceholder('VD: Trở thành Principal Engineer, Tối ưu chi phí Cloud $50k/tháng...').fill('Senior Backend Engineer');
    await page.getByPlaceholder('VD: Đạt được tự do kỹ thuật, làm chủ kiến trúc lớn và không bị động khi hệ thống mở rộng...').fill('Ship robust backend systems');
    await page.getByRole('button', { name: /Tạo & Lập Lộ Trình Ngay/i }).click();

    await expect(page.getByText('Senior Backend Engineer', { exact: true })).toBeVisible();
  });

  test('creates a manual micro-step from the tracker', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Vi Bước Lập Trình', exact: true }).click();
    await page.getByRole('button', { name: /Thêm Vi Bước Thủ Công/i }).click();

    await page.getByPlaceholder('VD: Viết test case kiểm tra hàm tính tổng').fill('Viết test auth cơ bản');
    await page.getByPlaceholder('VD: Mở file math.spec.ts và thêm describe(\'sum\')').fill('Mở file auth.spec.ts và viết một test đầu tiên');
    await page.locator('input[type="number"]').fill('10');
    await page.getByRole('button', { name: /Tạo Vi Bước/i }).click();

    await expect(page.getByText('Viết test auth cơ bản', { exact: true })).toBeVisible();
  });
});
