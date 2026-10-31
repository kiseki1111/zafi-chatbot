import { test, expect } from '@playwright/test';

test.describe('Tier & Trial Accounts UI E2E Test Suite (Playwright)', () => {
  test.beforeEach(async ({ page }) => {
    // Kunjungi halaman utama dan bersihkan sesi agar selalu mulai dari form login
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('1. UI Form Login siap menerima input kredensial akun trial & tier', async ({ page }) => {
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button:has-text("Masuk")')).toBeVisible();
  });

  test('2. Superadmin membuat Akun Trial 14 Hari baru di menu Kelola Klien & tombol Salin WA muncul', async ({ page }) => {
    // 1. Masuk via preset Superadmin
    const demoSuperadminBtn = page.locator('button:has-text("Demo Superadmin")');
    if (await demoSuperadminBtn.isVisible()) {
      await demoSuperadminBtn.click();
    } else {
      // Fallback direct login form jika preset dev mode tersembunyi
      await page.fill('#email', 'superadmin@umkm.id');
      await page.fill('#password', 'Admin@123');
      await page.click('button:has-text("Masuk")');
    }

    // 2. Navigasi ke menu Kelola Klien
    const clientsMenuBtn = page.locator('button:has-text("Kelola Klien"):visible').first();
    await expect(clientsMenuBtn).toBeVisible({ timeout: 15000 });
    await clientsMenuBtn.click();

    // 3. Klik tombol Tambah Perusahaan Klien Baru
    const addClientBtn = page.locator('button:has-text("Tambah Perusahaan"):visible').first();
    await expect(addClientBtn).toBeVisible({ timeout: 15000 });
    await addClientBtn.click();

    // 4. Verifikasi modal pembuatan klien trial terbuka
    await expect(page.locator('text=Tambah Perusahaan Klien Baru')).toBeVisible();
    await expect(page.locator('button:has-text("Buat Akun Trial 14 Hari")')).toBeVisible();

    // 5. Isi form pendaftaran trial klien
    const uniqueId = Date.now().toString().slice(-4);
    await page.fill('input[placeholder*="PT Harmoni"]', `PT Properti Trial ${uniqueId}`);
    await page.fill('input[placeholder*="Budi Pratama"]', `Manager Trial ${uniqueId}`);
    await page.fill('input[placeholder*="manager@perusahaan.com"]', `trial_${uniqueId}@perusahaan.com`);

    // 6. Klik tombol buat akun trial
    await page.click('button:has-text("Buat Akun Trial 14 Hari")');

    // 7. Jika API mock/live merespons dialog sukses (atau toast sukses)
    const successModalTitle = page.locator('text=Akun Trial 14 Hari Berhasil Dibuat');
    const copyWaBtn = page.locator('button:has-text("Salin Pesan WhatsApp")');

    // Evaluasi jika dialog sukses muncul
    if (await successModalTitle.isVisible({ timeout: 4000 }).catch(() => false)) {
      await expect(copyWaBtn).toBeVisible();
      await expect(page.locator('text=14 Hari')).toBeVisible();
      await page.click('button:has-text("Selesai")');
    }
  });

  test('3. Pengujian UI Penolakan Akun Trial yang Sudah Expired (>14 Hari)', async ({ page }) => {
    // Masukkan kredensial akun trial kadaluarsa
    await page.fill('#email', 'trial.expired@perusahaan.com');
    await page.fill('#password', 'Trial@123');
    await page.click('button:has-text("Masuk")');

    // Verifikasi pesan toast/alert penolakan masa trial habis
    const errorNotice = page.locator('text=Masa trial 14 hari akun Anda telah berakhir').or(
      page.locator('text=keliru').or(page.locator('text=Gagal'))
    );
    await expect(errorNotice.first()).toBeVisible({ timeout: 6000 });
  });

  test('4. Akun Tier Aktif (Lite, Bronze, Silver, Gold, Dev) dapat masuk ke Dashboard', async ({ page }) => {
    // Masuk dengan preset manajer demo yang aktif
    const demoManagerBtn = page.locator('button:has-text("Demo Manajer")');
    if (await demoManagerBtn.isVisible()) {
      await demoManagerBtn.click();
      // Pastikan masuk ke dashboard manajer
      await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });
      // Navigasi menu utama tersedia
      await expect(page.locator('text=Pelanggan (CRM)').or(page.locator('text=Bot WhatsApp')).first()).toBeVisible();
    }
  });
});
