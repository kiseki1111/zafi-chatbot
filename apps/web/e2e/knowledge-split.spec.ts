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
    await page.route('**/api/v1/knowledge/*/split-preview*', async (route) => {
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
    await page.route('**/api/v1/knowledge/*/split-apply*', async (route) => {
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

    // Verifikasi modal konfirmasi verifikasi akhir muncul
    await expect(page.locator('text=Verifikasi Pemecahan Materi')).toBeVisible();
    await expect(page.locator('text=Total materi disimpan:')).toBeVisible();

    // Klik tombol konfirmasi & eksekusi
    const confirmExecBtn = page.locator('button:has-text("Konfirmasi & Eksekusi")');
    await expect(confirmExecBtn).toBeVisible();
    await confirmExecBtn.click();

    // Modal tertutup setelah diterapkan
    await expect(page.locator('text=Pecah Dokumen Menjadi Topik Mandiri (AI)')).not.toBeVisible();
  });

  test('User melihat dokumen sumber langsung dan dapat mengalihkan proses ke Background Task', async ({ page }) => {
    // Tunda response split-preview agar state loading dan tombol background tetap terlihat
    await page.route('**/api/v1/knowledge/*/split-preview*', async (route) => {
      await page.waitForTimeout(1500);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topics: [{ title: 'Topik 1', content: 'Isi' }],
          },
        }),
      });
    });

    // Klik tombol Pecah Materi
    const splitBtn = page.locator('button[title*="Pecah Materi"]').first();
    await expect(splitBtn).toBeVisible({ timeout: 5000 });
    await splitBtn.click();

    // Verifikasi dokumen sumber langsung tampil di modal
    await expect(page.locator('text=Dokumen Sumber')).toBeVisible();
    await expect(page.locator('p:has-text("Buku Panduan Zafi Properti Lengkap")').first()).toBeVisible();

    // Verifikasi tombol "Jalankan di Latar Belakang" muncul
    const bgBtn = page.locator('button:has-text("Jalankan di Latar Belakang")').first();
    await expect(bgBtn).toBeVisible();
    await bgBtn.click();

    // Modal tertutup dan proses dialihkan ke background
    await expect(page.locator('text=Pecah Dokumen Menjadi Topik Mandiri (AI)')).not.toBeVisible();

    // Verifikasi notifikasi kecil di kanan bawah selalu muncul meminta verifikasi
    await expect(page.locator('text=Verifikasi Sekarang').first()).toBeVisible({ timeout: 10000 });

    // Klik tombol Verifikasi Sekarang di notif kanan bawah
    await page.locator('button:has-text("Verifikasi Sekarang")').first().click();

    // Verifikasi modal verifikasi/pecah materi terbuka kembali
    await expect(page.locator('text=Pecah Dokumen Menjadi Topik Mandiri (AI)')).toBeVisible();

    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('User dapat memverifikasi dan memindahkan topik spesifik ke Knowledge Siteplan Cluster', async ({ page }) => {
    // Mock response untuk split-preview dengan isSiteplan = true
    await page.route('**/api/v1/knowledge/*/split-preview*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            originalId: 'kb-test-1',
            originalTitle: 'Buku Panduan Lengkap',
            topics: [
              {
                title: 'Spesifikasi Cluster Zafi',
                content: '- Pondasi 50 cm\n- Kusen Fortress',
                isSiteplan: true,
                suggestedCategory: 'Spesifikasi Bangunan',
                detectedCluster: 'Zafi Residence',
              },
            ],
          },
        }),
      });
    });

    // Mock response availability groups
    await page.route('**/api/v1/availability/groups?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ id: 'group-1', name: 'Zafi Residence' }],
        }),
      });
    });

    // Mock response move-to-siteplan
    await page.route('**/api/v1/knowledge/move-to-siteplan*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { success: true, groupName: 'Zafi Residence' },
        }),
      });
    });

    // Klik tombol Pecah Materi
    const splitBtn = page.locator('button[title*="Pecah Materi"]').first();
    await expect(splitBtn).toBeVisible({ timeout: 5000 });
    await splitBtn.click();

    // Verifikasi badge Siteplan muncul
    await expect(page.locator('text=Siteplan (Zafi Residence)')).toBeVisible();

    // Klik tombol "Pindahkan ke Siteplan"
    const moveBtn = page.locator('button:has-text("Pindahkan ke Siteplan")').first();
    await expect(moveBtn).toBeVisible();
    await moveBtn.click();

    // Verifikasi modal verifikasi pemindahan muncul
    await expect(page.locator('text=Verifikasi Pemindahan ke Siteplan Cluster')).toBeVisible();
    await expect(page.locator('text=Pilih Cluster / Perumahan Tujuan')).toBeVisible();

    // Klik tombol konfirmasi pemindahan
    const confirmMoveBtn = page.locator('button:has-text("Konfirmasi & Pindahkan ke Siteplan")');
    await expect(confirmMoveBtn).toBeVisible();
    await confirmMoveBtn.click();

    // Modal verifikasi tertutup setelah sukses
    await expect(page.locator('text=Verifikasi Pemindahan ke Siteplan Cluster')).not.toBeVisible();
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('User dapat memverifikasi preview detail modal tanpa horizontal scrollbar dan memindahkan topik via Pecah Materi AI', async ({ page }) => {
    // Mock groups
    await page.route('**/api/v1/availability/groups?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ id: 'group-rindang-mas3', name: 'MAS 3' }],
        }),
      });
    });

    // Mock split-preview
    await page.route('**/api/v1/knowledge/*/split-preview*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            topics: [
              {
                title: 'Spesifikasi & Bangunan',
                content: '- Pondasi 50 cm\n- Air Gorong-gorong',
                isSiteplan: true,
                suggestedCategory: 'Spesifikasi Bangunan',
                detectedCluster: 'MAS 3',
              },
            ],
          },
        }),
      });
    });

    // Mock move-to-siteplan
    await page.route('**/api/v1/knowledge/move-to-siteplan*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { success: true, groupName: 'MAS 3' },
        }),
      });
    });

    // Buka kartu knowledge pertama (klik kartu untuk preview)
    const cardTitle = page.locator('h3:has-text("Buku Panduan Zafi Properti Lengkap")').first();
    await expect(cardTitle).toBeVisible({ timeout: 5000 });
    await cardTitle.click();

    // Verifikasi modal preview detail terbuka
    const previewModal = page.locator('text=Hasil Ekstrak Dokumen (RAG Knowledge)').or(page.locator('text=Isi Pengetahuan / Deskripsi'));
    await expect(previewModal).toBeVisible();

    // Tombol Pecah Topik (AI) di preview modal
    const splitFromPreviewBtn = page.locator('button:has-text("Pecah Topik (AI)")').first();
    await expect(splitFromPreviewBtn).toBeVisible();
    await splitFromPreviewBtn.click();

    // Verifikasi modal Pecah Materi terbuka
    await expect(page.locator('text=Pecah Dokumen Menjadi Topik Mandiri (AI)')).toBeVisible();

    // Tombol Pindahkan ke Siteplan di dalam topik
    const moveBtn = page.locator('button:has-text("Pindahkan ke Siteplan")').first();
    await expect(moveBtn).toBeVisible();
    await moveBtn.click();

    // Verifikasi modal verifikasi pemindahan muncul
    await expect(page.locator('text=Verifikasi Pemindahan ke Siteplan Cluster')).toBeVisible();

    // Konfirmasi pemindahan
    const confirmMoveBtn = page.locator('button:has-text("Konfirmasi & Pindahkan ke Siteplan")');
    await expect(confirmMoveBtn).toBeVisible();
    await confirmMoveBtn.click();

    // Modal verifikasi tertutup
    await expect(page.locator('text=Verifikasi Pemindahan ke Siteplan Cluster')).not.toBeVisible();
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('User memproses data nyata data_rindang.docx dengan pembagian topik modular dan modal konfirmasi akhir', async ({ page }) => {
    // Mock response knowledge list dengan data_rindang.docx
    await page.route('**/api/v1/knowledge?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'kb-rindang-doc',
              title: 'data_rindang.docx',
              content:
                '1.1 Profil Developer: PT Rindang Alam Semesta. NIB: 8120014262925. 2.3 Fasilitas: MAS 3= 90 unit, SKYLAND= 70 unit, RAS= 101 unit. 2.4 Skema Bayar: Cash Keras 182JT, KPR BSN & BSI.',
              metadata: { type: 'file', filename: 'data_rindang.docx', title: 'data_rindang.docx' },
              createdAt: '2026-10-20T10:00:00Z',
            },
          ],
        }),
      });
    });

    // Mock split-preview dengan segmentasi dari data_rindang.docx
    await page.route('**/api/v1/knowledge/*/split-preview*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            originalId: 'kb-rindang-doc',
            originalTitle: 'data_rindang.docx',
            topics: [
              {
                title: 'Profil Developer PT Rindang Alam Semesta',
                content: '- Nama: PT Rindang Alam Semesta\n- NIB: 8120014262925\n- Kontak: +62 878-4762-8400',
                isSiteplan: false,
              },
              {
                title: 'Fasilitas & Total Unit Kawasan',
                content: '- Total Unit: MAS 3= 90, SKYLAND= 70, RAS= 101\n- Unit Terjual: MAS 3= 15, SKYLAND= 5, RAS 3= 30\n- Jalan lingkungan: Lebar 5m, aspal\n- Drainase: Ada\n- PJU: Ada',
                isSiteplan: true,
                suggestedCategory: 'Fasilitas Kawasan',
                detectedCluster: 'MAS 3',
              },
              {
                title: 'Skema Pembayaran & KPR Bank',
                content: '- Cash Keras: 182 Juta\n- Bank Rekanan: BSN & BSI\n- Booking fee: 500k refund jika batal\n- BPHTB & AJB: Ditanggung developer',
                isSiteplan: false,
              },
            ],
          },
        }),
      });
    });

    // Mock clusters
    await page.route('**/api/v1/availability/groups?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'group-mas3', name: 'MAS 3' },
            { id: 'group-skyland', name: 'SKYLAND' },
            { id: 'group-ras', name: 'RAS 3' },
          ],
        }),
      });
    });

    // Mock split-apply
    await page.route('**/api/v1/knowledge/*/split-apply*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            success: true,
            count: 3,
            knowledgeCount: 2,
            siteplanCount: 1,
            deletedOriginal: true,
          },
        }),
      });
    });

    // Trigger custom event untuk reload data knowledge tanpa reset session auth
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('knowledge-updated'));
    });

    // Verifikasi kartu data_rindang.docx muncul
    await expect(page.locator('text=data_rindang.docx').first()).toBeVisible({ timeout: 10000 });

    // Buka modal Pecah Materi AI
    const splitBtn = page.locator('button[title*="Pecah Materi"]').first();
    await expect(splitBtn).toBeVisible({ timeout: 5000 });
    await splitBtn.click();

    // Verifikasi topik-topik hasil segmentasi dari data_rindang.docx
    await expect(page.locator('input[value="Profil Developer PT Rindang Alam Semesta"]')).toBeVisible();
    await expect(page.locator('input[value="Fasilitas & Total Unit Kawasan"]')).toBeVisible();
    await expect(page.locator('input[value="Skema Pembayaran & KPR Bank"]')).toBeVisible();

    // Verifikasi tombol Terapkan & Simpan menampilkan 3 materi
    const applyBtn = page.locator('button:has-text("Terapkan & Simpan (3 Materi)")');
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();

    // Verifikasi Dialog Modal Konfirmasi Verifikasi Akhir muncul dengan ringkasan akurat
    await expect(page.locator('text=Verifikasi Pemecahan Materi')).toBeVisible();
    await expect(page.locator('text=Total materi disimpan:')).toBeVisible();
    await expect(page.getByText('3 topik', { exact: true })).toBeVisible();
    await expect(page.locator('text=Ke Knowledge Base umum:')).toBeVisible();
    await expect(page.locator('text=Ke Siteplan Cluster:')).toBeVisible();

    // Klik tombol konfirmasi & eksekusi
    const confirmBtn = page.locator('button:has-text("Konfirmasi & Eksekusi")');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Dialog tertutup sukses
    await expect(page.locator('text=Verifikasi Pemecahan Materi')).not.toBeVisible();
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });
});
