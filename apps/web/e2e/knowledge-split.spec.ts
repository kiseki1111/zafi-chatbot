import { test, expect } from '@playwright/test';

test.describe('E2E Knowledge AI Segmentation (Pecah Materi)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock response untuk daftar knowledge base agar memiliki 1 dokumen panjang
    await page.route('**/api/v1/knowledge?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'kb-test-1',
              title: 'Buku Panduan Zafi Properti Lengkap',
              content:
                'Zafi Residence berlokasi di Kubu Raya. Tipe 36 harga 182 juta. Spesifikasi: 2 kamar tidur, 1 kamar mandi, listrik 1300W. Syarat KPR: KTP, KK, NPWP, Slip Gaji 3 bulan terakhir.',
              metadata: { type: 'text', title: 'Buku Panduan Zafi Properti Lengkap' },
              createdAt: '2026-10-19T10:00:00Z',
            },
          ],
        }),
      });
    });

    // 1. Masuk sebagai Demo Manajer
    await page.goto('/');
    const demoManagerBtn = page.locator('button:has-text("Demo Manajer")');
    await expect(demoManagerBtn).toBeVisible({ timeout: 10000 });
    await demoManagerBtn.click();

    // 2. Klik menu "Knowledge Base" di sidebar
    const kbMenuBtn = page.locator('button:has-text("Knowledge Base")').first();
    await expect(kbMenuBtn).toBeVisible({ timeout: 10000 });
    await kbMenuBtn.click();

    // 3. Verifikasi berada di halaman Knowledge Base
    await expect(page.locator('h1:has-text("Knowledge Base")').first()).toBeVisible({ timeout: 10000 });
  });

  test('User dapat membuka modal Pecah Materi AI dan melihat topik hasil analisis', async ({ page }) => {
    // Mock response untuk split-preview
    await page.route('**/api/v1/knowledge/*/split-preview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            originalId: 'kb-test-1',
            originalTitle: 'Buku Panduan Lengkap',
            topics: [
              {
                title: 'Pricelist & Tipe Rumah',
                content: 'Rumah tipe 36 subsidi seharga 182 juta di Kubu Raya.',
              },
              {
                title: 'Spesifikasi & Material',
                content: 'Pondasi 50 cm, keramik 40x40, kusen pintu fortress.',
              },
            ],
          },
        }),
      });
    });

    // Mock response untuk split-apply
    await page.route('**/api/v1/knowledge/*/split-apply', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            success: true,
            count: 2,
            deletedOriginal: true,
          },
        }),
      });
    });

    // Cari tombol "Pecah Materi ini dengan AI" pada kartu knowledge pertama
    const splitBtn = page.locator('button[title*="Pecah Materi"]').first();
    await expect(splitBtn).toBeVisible({ timeout: 5000 });
    await splitBtn.click();

    // Verifikasi modal pemecahan AI muncul
    await expect(page.locator('text=Pecah Dokumen Menjadi Topik Mandiri (AI)')).toBeVisible();

    // Verifikasi topik hasil pemecahan muncul
    await expect(page.locator('input[value="Pricelist & Tipe Rumah"]')).toBeVisible();
    await expect(page.locator('input[value="Spesifikasi & Material"]')).toBeVisible();

    // Verifikasi konten masing-masing topik terisi
    await expect(page.locator('textarea:has-text("Rumah tipe 36 subsidi")')).toBeVisible();
    await expect(page.locator('textarea:has-text("Pondasi 50 cm")')).toBeVisible();

    // Verifikasi tombol Terapkan menampilkan jumlah materi
    const applyBtn = page.locator('button:has-text("Terapkan & Simpan (2 Materi)")');
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();

    // Modal tertutup setelah diterapkan
    await expect(page.locator('text=Pecah Dokumen Menjadi Topik Mandiri (AI)')).not.toBeVisible();
  });
});
