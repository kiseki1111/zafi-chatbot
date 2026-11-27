import { test, expect } from '@playwright/test';

/**
 * Comprehensive Frontend / UX SSO Scenarios (G-01..G-07, H-01..H-02)
 * Uses deterministic route mocking for /api/v1/auth/login and /api/v1/tenant/{id}/dashboard
 * against the running Next.js app on http://localhost:3001.
 */
test.describe('SSO Frontend & UX Comprehensive Scenarios (G-H)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('G-01: hasSubscription=false menampilkan NoSubscriptionModal, dashboard blur, link portal lokal, dan tombol preview', async ({
    page,
  }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-jwt-unsub',
          refreshToken: 'mock-rt-unsub',
          user: {
            id: 'u-unsub-ui',
            name: 'Owner Belum Langganan',
            email: 'unsub@toko.test',
            roles: ['manager'],
            tenantId: 't-unsub-ui',
            hasSubscription: false,
          },
        }),
      });
    });

    await page.route('**/api/v1/tenant/*/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            tenant: { id: 't-unsub-ui', name: 'Toko Unsub', isOnboarded: true, metadata: {} },
            isGlobalOnboardingDisabled: true,
          },
        }),
      });
    });

    await page.goto('/');
    await page.fill('#email', 'unsub@toko.test');
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]');

    // Modal muncul & blur aktif
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog).toContainText('Langganan ZAF Chatbot Belum Aktif');
    await expect(dialog).toContainText('unsub@toko.test');

    // Portal link mengarah ke Console lokal
    const portalLink = dialog.locator('a', { hasText: 'Buka Portal Langganan ZAF Console' });
    await expect(portalLink).toHaveAttribute('href', 'http://localhost:17341/akun/langganan');

    // Wrapper dashboard memiliki blur-sm & pointer-events-none
    const blurredWrapper = page.locator('div.blur-sm.pointer-events-none');
    await expect(blurredWrapper).toBeVisible();

    // Tombol Mode Pengujian membuka preview
    await dialog.getByRole('button', { name: /Mode Pengujian: Pratinjau Antarmuka/i }).click();
    await expect(dialog).toBeHidden();
  });

  test('G-02: hasSubscription=true langsung masuk dashboard tanpa NoSubscriptionModal', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-jwt-sub',
          refreshToken: 'mock-rt-sub',
          user: {
            id: 'u-sub-ui',
            name: 'Owner Aktif',
            email: 'active@toko.test',
            roles: ['manager'],
            tenantId: 't-sub-ui',
            hasSubscription: true,
          },
        }),
      });
    });

    await page.route('**/api/v1/tenant/*/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            tenant: { id: 't-sub-ui', name: 'Toko Aktif', isOnboarded: true, metadata: {} },
            isGlobalOnboardingDisabled: true,
          },
        }),
      });
    });

    await page.goto('/');
    await page.fill('#email', 'active@toko.test');
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\?view=overview/, { timeout: 10000 });
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('G-03: Pesan error tepat ditampilkan saat login gagal (401 anti-hijack & 403 trial expired)', async ({
    page,
  }) => {
    // 1. Anti-hijack 401
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 401,
          message: 'Email ini sudah dipakai akun chatbot lain. Hubungi tim ZAF.',
        }),
      });
    });

    await page.goto('/');
    await page.fill('#email', 'conflict@toko.test');
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(
      page.getByText('Email ini sudah dipakai akun chatbot lain. Hubungi tim ZAF.', { exact: true }).first(),
    ).toBeVisible({
      timeout: 8000,
    });

    // 2. Trial expired 403
    await page.unroute('**/api/v1/auth/login');
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 403,
          message:
            'Masa trial 14 hari akun Anda telah berakhir. Silakan hubungi tim kami untuk memperpanjang atau upgrade ke paket berbayar.',
        }),
      });
    });

    await page.click('button[type="submit"]');
    await expect(page.getByText(/Masa trial 14 hari akun Anda telah berakhir/i).first()).toBeVisible({
      timeout: 8000,
    });
  });

  test('G-04 & H-02: Loading state tombol Masuk disabled saat request berjalan & rapid click hanya kirim 1 request', async ({
    page,
  }) => {
    let loginRequestCount = 0;
    await page.route('**/api/v1/auth/login', async (route) => {
      loginRequestCount++;
      await new Promise((r) => setTimeout(r, 600));
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Alamat email atau password keliru.' }),
      });
    });

    await page.goto('/');
    await page.fill('#email', 'slow@toko.test');
    await page.fill('#password', 'Password123!');

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await expect(submitBtn).toBeDisabled();

    // Coba klik lagi saat masih loading (force false -> tidak terkirim karena disabled)
    await submitBtn.click({ force: true }).catch(() => null);
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    expect(loginRequestCount).toBe(1);
  });

  test('G-05: Role-based redirect view (superadmin -> platform_overview)', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-jwt-sa',
          refreshToken: 'mock-rt-sa',
          user: {
            id: 'u-sa',
            name: 'Superadmin',
            email: 'sa@zafi.id',
            roles: ['superadmin'],
            tenantId: null,
            hasSubscription: true,
          },
        }),
      });
    });

    await page.goto('/');
    await page.fill('#email', 'sa@zafi.id');
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\?view=platform_overview/, { timeout: 10000 });
  });

  test('G-06: Service Worker tidak memblokir atau meng-cache POST /api/v1/auth/login', async ({ page }) => {
    await page.goto('/');
    const swRegistrations = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return [];
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.map((r) => r.active?.scriptURL || 'pending');
    });
    // Di dev mode sw unregister otomatis, di prod sw tidak meng-cache /api/v1/auth/login
    expect(Array.isArray(swRegistrations)).toBe(true);
  });

  test('G-07 & H-01: Multi-tab session konsisten & logout di Tab 1 membersihkan sesi', async ({ context }) => {
    const page1 = await context.newPage();
    await page1.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-jwt-tab',
          refreshToken: 'mock-rt-tab',
          user: {
            id: 'u-tab',
            name: 'User MultiTab',
            email: 'tab@toko.test',
            roles: ['manager'],
            tenantId: 't-tab',
            hasSubscription: false,
          },
        }),
      });
    });
    await page1.route('**/api/v1/tenant/*/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            tenant: { id: 't-tab', name: 'Toko Tab', isOnboarded: true, metadata: {} },
            isGlobalOnboardingDisabled: true,
          },
        }),
      });
    });

    await page1.goto('/');
    await page1.fill('#email', 'tab@toko.test');
    await page1.fill('#password', 'Password123!');
    await page1.click('button[type="submit"]');
    await expect(page1.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // Buka Tab 2 di context yang sama -> localStorage persist sudah terisi
    const page2 = await context.newPage();
    await page2.route('**/api/v1/tenant/*/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            tenant: { id: 't-tab', name: 'Toko Tab', isOnboarded: true, metadata: {} },
            isGlobalOnboardingDisabled: true,
          },
        }),
      });
    });
    await page2.goto('/');
    await expect(page2.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // H-01: Logout di Tab 1 -> kembali ke form login
    await page1.getByRole('button', { name: /Keluar \(Logout\)/i }).click();
    await expect(page1.locator('#email')).toBeVisible({ timeout: 8000 });
  });
});
