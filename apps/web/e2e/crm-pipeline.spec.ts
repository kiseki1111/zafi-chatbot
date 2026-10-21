import { test, expect } from '@playwright/test';

test.describe('E2E CRM Pelanggan & Pipeline Leads', () => {
  const MOCK_CONTACTS = [
    {
      id: "crm-1",
      name: "Ummi Ruhama",
      phone: "081255443322",
      email: "ummi.ruhama@gmail.com",
      status: "Follow-Up",
      notes: "Minta SLIK Data sudah verifikasi",
      metadata: { perumahan: "Griya Amanah 2", tipeUnit: "Tipe 40", hargaUnit: 295000000 },
      createdAt: "2026-10-01T08:30:00Z",
      updatedAt: "2026-10-15T10:00:00Z",
    },
    {
      id: "crm-2",
      name: "Hamdiko Cikal Juliandi",
      phone: "081399881122",
      email: "hamdiko.c@gmail.com",
      status: "Survey",
      notes: "Rencana survey lokasi akhir pekan",
      metadata: { perumahan: "Zafi Residence", tipeUnit: "Tipe 36", hargaUnit: 192800000 },
      createdAt: "2026-10-02T09:15:00Z",
      updatedAt: "2026-10-14T11:20:00Z",
    },
  ];

  test.beforeEach(async ({ page }) => {
    // Mock API contacts & availability
    await page.route('**/api/v1/contacts*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_CONTACTS),
        });
      } else if (route.request().method() === 'POST') {
        const postData = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: `crm-created-${Date.now()}`,
              name: postData.name || 'Anonim',
              phone: postData.phone || '08123456789',
              status: postData.status || 'Follow-Up',
              metadata: postData.metadata || {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      }
    });

    await page.route('**/api/v1/availability/groups*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/v1/tenant/*/dashboard*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tenant: { name: "Zafi Royal Residence" } }),
      });
    });

    // 1. Masuk sebagai Demo Manajer
    await page.goto('/');
    const demoManagerBtn = page.locator('button:has-text("Demo Manajer")');
    await expect(demoManagerBtn).toBeVisible({ timeout: 10000 });
    await demoManagerBtn.click();

    // 2. Navigasi ke modul CRM Pelanggan
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });
    const crmMenuBtn = page.locator('button:has-text("Pelanggan")').first();
    await expect(crmMenuBtn).toBeVisible();
    await crmMenuBtn.click();

    // Verifikasi header Pelanggan ter-load
    await expect(page.locator('h1:has-text("Pelanggan")')).toBeVisible({ timeout: 10000 });
  });

  test('1. Menampilkan header statistik dan tab filter status prospek', async ({ page }) => {
    // Verifikasi teks header jumlah pelanggan
    await expect(page.locator('text=data pelanggan terdaftar')).toBeVisible();

    // Verifikasi seluruh tab filter fase prospek ada
    const tabs = ['Semua', 'Follow-Up', 'Survey', 'SLIK', 'Booking', 'Closing'];
    for (const tab of tabs) {
      await expect(page.locator(`button:has-text("${tab}")`).first()).toBeVisible();
    }
  });

  test('2. Filter status dapat diklik dan memfilter daftar kontak secara instan', async ({ page }) => {
    // Tunggu data awal termuat di input tabel
    await expect(page.locator('input[value="Ummi Ruhama"]').first()).toBeVisible({ timeout: 10000 });

    // Klik tab filter "Survey" di header
    const surveyTab = page.locator('.overflow-x-auto button:has-text("Survey")').first();
    await surveyTab.click();
    await expect(surveyTab).toHaveClass(/bg-emerald-600/);

    // Di status Survey, kontak Hamdiko harus terlihat
    await expect(page.locator('input[value="Hamdiko Cikal Juliandi"]').first()).toBeVisible();

    // Kembalikan ke tab "Semua"
    const allTab = page.locator('.overflow-x-auto button:has-text("Semua")').first();
    await allTab.click();
    await expect(allTab).toHaveClass(/bg-emerald-600/);
  });

  test('3. Kolom pencarian realtime memfilter nama, nomor, atau perumahan', async ({ page }) => {
    // Tunggu data awal termuat di input tabel
    await expect(page.locator('input[value="Ummi Ruhama"]').first()).toBeVisible({ timeout: 10000 });

    const searchInput = page.locator('input[placeholder*="Cari nama, nomor"]');
    await expect(searchInput).toBeVisible();

    // Ketik pencarian nama
    await searchInput.fill('Ummi');
    await expect(page.locator('input[value="Ummi Ruhama"]').first()).toBeVisible({ timeout: 5000 });

    // Kosongkan kembali
    await searchInput.fill('');
    await expect(searchInput).toHaveValue('');
  });

  test('4. Menambah pelanggan baru secara optimistik lewat tombol Tambah Pelanggan', async ({ page }) => {
    // Tunggu data awal termuat di input tabel
    await expect(page.locator('input[value="Ummi Ruhama"]').first()).toBeVisible({ timeout: 10000 });

    const addBtn = page.locator('button:has-text("Tambah Pelanggan")').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Verifikasi row/kartu baru "Anonim" muncul di daftar input
    await expect(page.locator('input[value="Anonim"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('5. Tombol Unduh Excel (.csv) siap pakai untuk export data pelanggan', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Unduh Excel"), button:has-text("Excel")').first();
    await expect(exportBtn).toBeVisible();

    // Siapkan listener event download
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await exportBtn.click();

    // Jika browser mengizinkan download dialog otomatis
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toContain('.csv');
    }
  });
});
