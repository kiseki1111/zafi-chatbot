import { test, expect } from '@playwright/test';

test.describe('Web CMS & Dashboard Authentication Flow', () => {
  test('Halaman utama menampilkan form login dengan elemen input email & password', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('text=Masuk ke akun Anda')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button:has-text("Masuk")')).toBeVisible();
  });

  test('Preset login Demo Manajer berhasil masuk ke Dashboard Manajer', async ({ page }) => {
    await page.goto('/');

    const demoManagerBtn = page.locator('button:has-text("Demo Manajer")');
    await expect(demoManagerBtn).toBeVisible();
    await demoManagerBtn.click();

    // Pastikan shell dashboard dan navigasi muncul
    await expect(page.locator('text=Dashboard').first()).toBeVisible();
  });

  test('Preset login Demo Superadmin berhasil masuk ke halaman Superadmin', async ({ page }) => {
    await page.goto('/');

    const demoSuperadminBtn = page.locator('button:has-text("Demo Superadmin")');
    await expect(demoSuperadminBtn).toBeVisible();
    await demoSuperadminBtn.click();

    // Superadmin diarahkan ke menu manajemen platform
    await expect(page.locator('text=Ringkasan Platform').or(page.locator('text=Kelola Klien'))).toBeVisible();
  });
});
