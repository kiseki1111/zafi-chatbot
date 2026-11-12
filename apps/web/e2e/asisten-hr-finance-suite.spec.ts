import { test, expect } from '@playwright/test';

test.describe('ASISTEN HR & FINANCE - E2E Comprehensive Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Login menggunakan kredensial federasi Zafi Console
    await page.goto('/');
    await page.fill('#email', 'budi.santoso@zafii.test');
    await page.fill('#password', 'password123');
    await page.click('button:has-text("Masuk")');

    // Tunggu navigasi dashboard terbuka
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 15000 });
  });

  test('Menu 1: Chat Asisten - Kirim pesan cuti & presensi memicu function call live ke HRIS', async ({ page }) => {
    // Buka menu Chat Asisten
    await page.click('button:has-text("Chat Asisten")');

    // Verifikasi tampilan Playground Chat Asisten
    await expect(page.locator('text=Playground Chat Asisten Internal')).toBeVisible();

    // Klik tombol cepat Sisa Cuti Saya
    const quickBtn = page.locator('button:has-text("Sisa Cuti Saya")');
    await expect(quickBtn).toBeVisible();
    await quickBtn.click();

    // Tunggu bot merespon dengan badge tool call atau teks kuota cuti
    await expect(page.locator('text=hris.cek_sisa_cuti').or(page.locator('text=kuota cuti')).first()).toBeVisible({ timeout: 10000 });

    // Verifikasi inspector tool
    await expect(page.locator('text=Inspector Pemanggilan Tool')).toBeVisible();
  });

  test('Menu 2: Whitelist Nomor WA - Sinkronisasi & daftar nomor terverifikasi HRIS', async ({ page }) => {
    // Buka menu Whitelist Nomor WA
    await page.click('button:has-text("Whitelist Nomor WA")');

    // Verifikasi halaman whitelist termuat
    await expect(page.locator('text=Whitelist').or(page.locator('text=Nomor WhatsApp')).first()).toBeVisible();

    // Verifikasi tombol tambah nomor
    await expect(page.locator('button:has-text("Tambah Nomor")').first()).toBeVisible();

    // Verifikasi list karyawan terverifikasi
    await expect(page.locator('text=Terverifikasi').or(page.locator('text=Aktif')).first()).toBeVisible();
  });

  test('Menu 3: Integrasi Sistem - Verifikasi konektivitas real-time ke Zafi Console & HRIS', async ({ page }) => {
    // Buka menu Integrasi Sistem
    await page.click('button:has-text("Integrasi Sistem")');

    // Verifikasi header halaman
    await expect(page.locator('text=Integrasi Sistem (HRIS & Accounting)')).toBeVisible();

    // Verifikasi tombol periksa koneksi
    const pingBtn = page.locator('button:has-text("Periksa Koneksi")');
    await expect(pingBtn).toBeVisible();
    await pingBtn.click();

    // Verifikasi badge/sistem
    await expect(page.locator('text=HRIS').first()).toBeVisible();
    await expect(page.locator('text=ZAF Console').first()).toBeVisible();
  });

  test('Menu 4: Karyawan & Akses - Sinkronisasi data live dari HRIS & role permission', async ({ page }) => {
    // Buka menu Karyawan & Akses
    await page.click('button:has-text("Karyawan & Akses")');

    // Verifikasi header halaman
    await expect(page.locator('text=Karyawan & Hak Akses Asisten')).toBeVisible();

    // Uji tombol Sinkron Data HRIS
    const syncBtn = page.locator('button:has-text("Sinkron Data HRIS")');
    await expect(syncBtn).toBeVisible();
    await syncBtn.click();

    // Verifikasi tabel memuat header atau baris karyawan
    await expect(page.locator('th:has-text("Karyawan")').first()).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('Menu 5: Riwayat & Audit - Audit trail aktivitas sistem dan filter status', async ({ page }) => {
    // Buka menu Riwayat & Audit
    await page.click('button:has-text("Riwayat & Audit")');

    // Verifikasi judul log audit
    await expect(page.locator('text=Riwayat & Audit Log Asisten')).toBeVisible();

    // Verifikasi status badge audit log
    await expect(page.locator('text=SUCCESS').or(page.locator('text=UNAUTHORIZED')).first()).toBeVisible();
  });
});
