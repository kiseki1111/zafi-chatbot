import { test, expect } from '@playwright/test';

test.describe('Zafi Console SSO & Federated Authentication', () => {
  test('Login menggunakan kredensial Zafi Console berhasil masuk ke dashboard Chatbot', async ({ page }) => {
    // Navigasi ke halaman login Chatbot
    await page.goto('/');

    // Input kredensial yang terdaftar di Zafi Console (portal customer)
    await page.fill('#email', 'ekosistem.test@zafii.test');
    await page.fill('#password', 'password123');

    // Klik tombol Masuk
    await page.click('button:has-text("Masuk")');

    // Pastikan diarahkan dan dashboard terbuka
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 15000 });
  });

  test('Integrasi Ekosistem: Chatbot backend dapat menarik data live dari HRIS', async ({ request }) => {
    // Verifikasi endpoint integrasi HRIS via backend Chatbot
    const healthRes = await request.get('http://localhost:3030/api/v1/hris/health');
    expect(healthRes.ok()).toBeTruthy();
    const healthJson = await healthRes.json();
    expect(healthJson.data.status).toBe('CONNECTED');
    expect(healthJson.data.totalKaryawanAktif).toBeGreaterThanOrEqual(1);

    const attendanceRes = await request.get('http://localhost:3030/api/v1/hris/attendance/daily');
    expect(attendanceRes.ok()).toBeTruthy();
    const attendanceJson = await attendanceRes.json();
    expect(attendanceJson.data.total_karyawan).toBeGreaterThanOrEqual(1);
  });
});
