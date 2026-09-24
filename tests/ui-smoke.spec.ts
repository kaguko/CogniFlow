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
});
