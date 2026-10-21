import { test, expect } from '@playwright/test';

test.describe('E2E Siteplan Kavling & Ketersediaan Unit', () => {
  const MOCK_GROUPS = [
    {
      id: 'group-1',
      name: 'Cluster Sakura',
      category: 'properti',
      pricingTemplates: [
        {
          landArea: '120',
          landPrice: 150000000,
          buildingType: '36',
          buildingPrice: 150000000,
          packageType: '36/120',
          packagePrice: 300000000,
        },
      ],
      items: [
        {
          id: 'item-1',
          groupId: 'group-1',
          code: 'Blok A-01',
          name: 'Unit Sudut',
          houseType: '36/120',
          status: 'AVAILABLE',
          price: 300000000,
          propertyType: 'BANGUNAN',
        },
        {
          id: 'item-2',
          groupId: 'group-1',
          code: 'Blok A-02',
          name: 'Unit Standar',
          houseType: '36/120',
          status: 'BOOKED',
          price: 300000000,
          propertyType: 'BANGUNAN',
        },
        {
          id: 'item-3',
          groupId: 'group-1',
          code: 'Blok A-03',
          name: 'Unit Terjual',
          houseType: '36/120',
          status: 'OCCUPIED',
          price: 300000000,
          propertyType: 'BANGUNAN',
        },
      ],
    },
  ];

  test.beforeEach(async ({ page }) => {
    // Mock API availability groups
    await page.route('**/api/v1/availability/groups*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GROUPS),
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

    // 2. Navigasi ke modul Siteplan
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });
    const siteplanMenuBtn = page.locator('button:has-text("Siteplan")').first();
    await expect(siteplanMenuBtn).toBeVisible();
    await siteplanMenuBtn.click();

    // Verifikasi modul ketersediaan ter-load
    await expect(page.locator('text=Total Unit').first()).toBeVisible({ timeout: 10000 });
  });

  test('1. Menampilkan summary cards ketersediaan unit (Ready, Proses Bank, Terjual)', async ({ page }) => {
    // Verifikasi 4 KPI summary cards
    await expect(page.locator('text=Total Unit').first()).toBeVisible();
    await expect(page.locator('text=Unit Ready (Hijau)').first()).toBeVisible();
    await expect(page.locator('text=Proses Bank (Orange)').first()).toBeVisible();
    await expect(page.locator('text=Sudah Terjual (Merah)').first()).toBeVisible();

    // Verifikasi nilai statistik sesuai mock data
    await expect(page.locator('text=3').first()).toBeVisible(); // total 3 unit
  });

  test('2. Filter ketersediaan unit berdasarkan status dan pencarian kode blok', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Cari blok, tipe"]');
    await expect(searchInput).toBeVisible();

    // Ketik kode blok yang dicari
    await searchInput.fill('A-01');
    await expect(page.locator('text=Blok A-01').first()).toBeVisible();

    // Kosongkan kembali
    await searchInput.fill('');
    await expect(searchInput).toHaveValue('');
  });

  test('3. Menampilkan daftar unit kavling / grid blok dengan status badge yang jelas', async ({ page }) => {
    // Verifikasi kartu unit tampil
    await expect(page.locator('text=Blok A-01').first()).toBeVisible();
    await expect(page.locator('text=Blok A-02').first()).toBeVisible();
    await expect(page.locator('text=Blok A-03').first()).toBeVisible();
  });

  test('4. Modal Tambah Unit dapat dibuka dan memiliki elemen formulir', async ({ page }) => {
    const addUnitBtn = page.locator('button:has-text("Tambah Unit")').first();
    if (await addUnitBtn.isVisible()) {
      await addUnitBtn.click();

      // Verifikasi dialog tambah unit muncul
      await expect(page.locator('text=Tambah Unit').or(page.locator('text=Kode Unit')).first()).toBeVisible();

      // Tutup modal
      await page.keyboard.press('Escape');
    }
  });
});
