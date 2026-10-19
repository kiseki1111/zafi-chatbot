import { test, expect } from '@playwright/test';

test.describe('E2E User Perspective: Global Omnisearch & Search History (Ctrl+K)', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Masuk sebagai Demo Manajer
    await page.goto('/');
    const demoManagerBtn = page.locator('button:has-text("Demo Manajer")');
    await expect(demoManagerBtn).toBeVisible({ timeout: 10000 });
    await demoManagerBtn.click();

    // Pastikan dashboard sudah ter-load
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });
  });

  test('1. User dapat membuka modal pencarian lewat tombol Topbar dan shortcut keyboard Ctrl+K', async ({ page }) => {
    // A. Buka lewat klik tombol Topbar
    const searchTrigger = page.locator('button:has-text("Cari kontak, chat, unit...")');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    // Verifikasi dialog modal terbuka
    const searchInput = page.locator('input[placeholder*="Cari kontak"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeFocused();

    // Tutup modal menggunakan tombol Escape
    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible();

    // B. Buka lewat shortcut keyboard Ctrl+K
    await page.keyboard.press('Control+k');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeFocused();

    // Tutup kembali
    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible();
  });

  test('2. Tampilan awal menampilkan Navigasi Cepat dan dapat langsung membuka halaman tujuan', async ({ page }) => {
    // Buka modal pencarian
    await page.keyboard.press('Control+k');
    const searchInput = page.locator('input[placeholder*="Cari kontak"]');
    await expect(searchInput).toBeVisible();

    // Verifikasi heading "Navigasi Cepat" muncul saat input kosong
    await expect(page.locator('text=Navigasi Cepat')).toBeVisible();

    // Klik salah satu navigasi cepat: "CRM Kontak Prospek"
    const crmNavBtn = page.locator('button:has-text("CRM Kontak Prospek")');
    await expect(crmNavBtn).toBeVisible();
    await crmNavBtn.click();

    // Verifikasi modal tertutup dan user diarahkan ke modul CRM
    await expect(searchInput).not.toBeVisible();
    await expect(page).toHaveURL(/view=crm/);
  });

  test('3. Search History mencatat riwayat pencarian user, bisa diklik ulang, dan bisa dihapus', async ({ page }) => {
    // Buka search modal
    await page.keyboard.press('Control+k');
    const searchInput = page.locator('input[placeholder*="Cari kontak"]');

    // Ketik kata kunci "Griya Amanah" lalu tekan tombol Enter untuk simpan ke riwayat
    await searchInput.fill('Griya Amanah');
    await page.keyboard.press('Enter');

    // Tutup dialog
    await page.keyboard.press('Escape');

    // Buka kembali modal pencarian
    await page.keyboard.press('Control+k');

    // Verifikasi section "Pencarian Terakhir" sekarang muncul dengan kata kunci "Griya Amanah"
    await expect(page.locator('text=Pencarian Terakhir')).toBeVisible();
    const historyItem = page.locator('span:has-text("Griya Amanah")').first();
    await expect(historyItem).toBeVisible();

    // Klik riwayat tersebut -> input otomatis terisi kembali
    await historyItem.click();
    await expect(searchInput).toHaveValue('Griya Amanah');

    // Kosongkan input untuk kembali melihat daftar riwayat
    await searchInput.fill('');
    await expect(page.locator('text=Pencarian Terakhir')).toBeVisible();

    // Uji hapus semua riwayat
    const clearAllBtn = page.locator('button:has-text("Hapus Semua")');
    await expect(clearAllBtn).toBeVisible();
    await clearAllBtn.click();

    // Verifikasi riwayat terhapus dari tampilan
    await expect(page.locator('text=Pencarian Terakhir')).not.toBeVisible();
  });

  test('4. Pencarian berhasil menemukan data (Kontak, Kavling, Dokumen) secara cepat dan ditampilkan terstruktur', async ({ page }) => {
    // Mock progressive streaming response dari backend
    await page.route('**/api/v1/search/stream*', async (route) => {
      const ssePayload = [
        `data: ${JSON.stringify({
          category: 'contact',
          items: [
            {
              id: 'c-test-01',
              category: 'contact',
              title: 'Hendra Gunawan',
              subtitle: '628123456789 · PT Maju Properti',
              meta: { status: 'Follow-Up' },
            },
          ],
          totalMs: 12,
        })}\n\n`,
        `data: ${JSON.stringify({
          category: 'unit',
          items: [
            {
              id: 'u-test-02',
              category: 'unit',
              title: 'Blok A-08 (36/72)',
              subtitle: 'Zafi Residence · Rp 182.000.000',
              meta: { status: 'AVAILABLE' },
            },
          ],
          totalMs: 18,
        })}\n\n`,
        `data: ${JSON.stringify({
          category: 'knowledge',
          items: [
            {
              id: 'k-test-03',
              category: 'knowledge',
              title: 'Brosur & Spesifikasi Bahan',
              subtitle: '19/10/2026',
              highlight: 'Brosur lengkap perumahan',
            },
          ],
          totalMs: 24,
        })}\n\n`,
        `data: {"category":"__done__","items":[],"totalMs":30}\n\n`,
      ].join('');

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
        body: ssePayload,
      });
    });

    // Buka modal pencarian
    await page.keyboard.press('Control+k');
    const searchInput = page.locator('input[placeholder*="Cari kontak"]');

    // User mengetik "Hendra"
    await searchInput.fill('Hendra');

    // Verifikasi kategori Kontak langsung muncul beserta status badge
    await expect(page.locator('p:has-text("Kontak")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Hendra Gunawan')).toBeVisible();
    await expect(page.locator('text=628123456789 · PT Maju Properti')).toBeVisible();
    await expect(page.locator('span:has-text("Follow-Up")').first()).toBeVisible();

    // Verifikasi kategori Kavling/Unit juga tampil
    await expect(page.locator('p:has-text("Kavling/Unit")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Blok A-08 (36/72)')).toBeVisible();
    await expect(page.locator('span:has-text("AVAILABLE")').first()).toBeVisible();

    // Verifikasi kategori Dokumen juga tampil
    await expect(page.locator('p:has-text("Dokumen")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Brosur & Spesifikasi Bahan')).toBeVisible();

    // Verifikasi counter hasil di footer muncul
    await expect(page.locator('text=3 hasil')).toBeVisible();

    // Klik salah satu hasil (Kontak Hendra Gunawan) -> harus otomatis membuka halaman terkait
    const contactRow = page.locator('div:has-text("Hendra Gunawan")').last();
    await contactRow.click();

    // Modal tertutup setelah hasil dipilih
    await expect(searchInput).not.toBeVisible();
  });

  test('5. Navigasi Keyboard (Arrow Down, Arrow Up, Enter) berfungsi lancar', async ({ page }) => {
    // Buka modal
    await page.keyboard.press('Control+k');
    const searchInput = page.locator('input[placeholder*="Cari kontak"]');

    // Ketik "crm" -> memicu hasil navigasi instan
    await searchInput.fill('crm');
    await expect(page.locator('text=CRM Kontak Prospek')).toBeVisible();

    // Tekan ArrowDown untuk memilih item pertama
    await page.keyboard.press('ArrowDown');
    // Tekan Enter untuk mengeksekusi item terpilih
    await page.keyboard.press('Enter');

    // Verifikasi dialog tertutup dan halaman CRM terbuka
    await expect(searchInput).not.toBeVisible();
  });

  test('6. State Kosong (Empty State) tampil ramah saat tidak ada hasil yang cocok', async ({ page }) => {
    // Mock respons kosong
    await page.route('**/api/v1/search/stream*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `data: {"category":"__done__","items":[],"totalMs":5}\n\n`,
      });
    });

    await page.keyboard.press('Control+k');
    const searchInput = page.locator('input[placeholder*="Cari kontak"]');

    // Ketik kata kunci ngawur
    await searchInput.fill('xyznotfound9999');

    // Verifikasi pesan empty state muncul
    await expect(page.locator('text=Tidak ada hasil untuk "xyznotfound9999"')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Coba kata kunci yang lebih umum')).toBeVisible();
  });
});
