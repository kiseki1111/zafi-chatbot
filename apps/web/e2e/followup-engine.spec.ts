import { test, expect } from '@playwright/test';

test.describe('E2E Automated Follow-Up Engine', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API follow-up
    await page.route('**/api/v1/followup/config*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isEnabled: true,
          scheduleTime: '09:00',
          inactivityHours: 24,
          followUpPrompt: null,
        }),
      });
    });

    await page.route('**/api/v1/followup/stats*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalFollowedUp: 15,
          pendingCount: 3,
          isEnabled: true,
        }),
      });
    });

    await page.route('**/api/v1/followup/list*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            contactId: 'c-1',
            contactName: 'Ummi Ruhama',
            contactPhone: '081255443322',
            instanceName: 'cs-utama',
            lastMessageAt: '2026-10-18T10:00:00Z',
          },
        ]),
      });
    });

    await page.route('**/api/v1/followup/history*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'h-1',
            contactPhone: '081399881122',
            contactName: 'Hamdiko Cikal',
            instanceName: 'cs-utama',
            followedUpAt: '2026-10-20T09:00:00Z',
          },
        ]),
      });
    });

    await page.route('**/api/v1/waha/instances*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'cs-utama', name: 'CS Utama (+62 812-3456-7890)', status: 'working' },
        ]),
      });
    });

    await page.route('**/api/v1/tenant/*/dashboard*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tenant: { name: 'Zafi Royal Residence' } }),
      });
    });

    // 1. Masuk sebagai Demo Manajer
    await page.goto('/');
    const demoManagerBtn = page.locator('button:has-text("Demo Manajer")');
    await expect(demoManagerBtn).toBeVisible({ timeout: 10000 });
    await demoManagerBtn.click();

    // 2. Navigasi ke modul Follow-Up
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });
    const followupMenuBtn = page.locator('button:has-text("Follow-Up")').first();
    await expect(followupMenuBtn).toBeVisible();
    await followupMenuBtn.click();

    // Verifikasi modul ter-load
    await expect(page.locator('h2:has-text("Follow-Up")')).toBeVisible({ timeout: 10000 });
  });

  test('1. Menampilkan header, tombol Trigger Sekarang, dan status KPI', async ({ page }) => {
    // Verifikasi tombol aksi
    await expect(page.locator('button:has-text("Refresh")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Trigger")').first()).toBeVisible();

    // Verifikasi nilai statistik
    await expect(page.locator('text=15').first()).toBeVisible(); // totalFollowedUp: 15
  });

  test('2. Panel konfigurasi follow-up (jam pengiriman & batas inaktif) dapat diakses', async ({ page }) => {
    // Cari elemen input jam atau switch
    const configPanel = page.locator('button[role="switch"]').or(page.locator('input[type="time"]')).or(page.locator('text=Konfigurasi')).first();
    await expect(configPanel).toBeVisible({ timeout: 5000 });
  });

  test('3. Menampilkan riwayat pengiriman atau antrean kontak inaktif', async ({ page }) => {
    // Verifikasi ada kontak inaktif atau riwayat di tabel
    await expect(page.locator('text=Ummi Ruhama').or(page.locator('text=Hamdiko Cikal')).first()).toBeVisible({ timeout: 5000 });
  });
});
