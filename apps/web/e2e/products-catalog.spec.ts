import { test, expect } from '@playwright/test';

test.describe('E2E Katalog Produk & Multi-SKU Variasi (Shopee Style)', () => {
  const MOCK_PRODUCTS = [
    {
      id: "prod-e2e-1",
      name: "Kemeja Flanel Casual Premium",
      category: "Pakaian Pria",
      price: 135000,
      stock: 42,
      imageUrl: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500",
      description:
        "Kemeja flanel lengan panjang premium bahan katun wol halus yang sangat nyaman digunakan seharian penuh di ruangan ber-AC maupun luar ruangan. Kemeja ini memiliki jahitan ganda yang sangat rapi dan tahan lama, cocok dipadukan dengan celana chino maupun jeans casual.",
      attributes: {
        images: [
          "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500",
          "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500",
        ],
        hasVariations: true,
        variationType: "Ukuran & Warna",
        variations: [
          { id: "v1", name: "Hitam - M", price: 135000, stock: 20 },
          { id: "v2", name: "Hitam - L", price: 135000, stock: 15 },
          { id: "v3", name: "Merah - XL", price: 145000, stock: 7 },
        ],
      },
    },
    {
      id: "prod-e2e-2",
      name: "Kopi Arabika Gayo Natural 250gr",
      category: "Makanan & Minuman",
      price: 85000,
      stock: 2,
      description: "Biji kopi single origin Arabika Aceh Gayo proses natural.",
      attributes: {
        hasVariations: false,
      },
    },
    {
      id: "prod-e2e-3",
      name: "Tumbler Stainless Steel 500ml",
      category: "Aksesoris",
      price: 99000,
      stock: 0,
      description: "Botol termos vakum tahan panas dingin.",
      attributes: {
        hasVariations: false,
      },
    },
  ];

  // Login preset "Demo Manajer" lalu pastikan shell dashboard tampil.
  // Menunggu tombol via expect (auto-retry) agar tidak race dengan navigasi client-side.
  async function loginAsDemoManager(page: import('@playwright/test').Page) {
    await page.goto('/');
    const demoManagerBtn = page.locator('button:has-text("Demo Manajer")');
    await expect(demoManagerBtn).toBeVisible({ timeout: 10000 });
    await demoManagerBtn.click();
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });
  }

  test.beforeEach(async ({ page }) => {
    // 1. Mock API products
    await page.route('**/api/v1/tenant/*/products*', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_PRODUCTS),
        });
      } else if (method === 'POST') {
        const postData = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: `prod-created-${Date.now()}`,
              name: postData.name || 'Produk Baru',
              category: postData.category || 'General',
              price: postData.price || 10000,
              stock: postData.stock || 5,
              description: postData.description || '',
              attributes: postData.attributes || {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      }
    });

    // 2. Mock Dashboard & Quota
    await page.route('**/api/v1/tenant/*/dashboard*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tenant: {
            name: "Zafi Group Store",
            metadata: {
              plan: "silver",
              enabledMenus: ["overview", "chatbot", "products", "crm", "knowledge", "settings"],
              productGallery: [
                {
                  id: "g1",
                  name: "Katalog Depan Kemeja",
                  description: "Foto katalog resolusi tinggi",
                  url: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500",
                  type: "image",
                },
              ],
            },
          },
        }),
      });
    });

    await page.route('**/api/v1/tenant/clients/*/quota*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plan: "silver",
          maxMau: 2500,
          maxAiResponses: 10000,
        }),
      });
    });

    // Masuk via login / demo (helper tunggu tombol & shell dashboard)
    await loginAsDemoManager(page);

    // Navigasi ke modul Katalog Produk
    const productMenuBtn = page.locator('button:has-text("Katalog Produk")').first();
    await expect(productMenuBtn).toBeVisible();
    await productMenuBtn.click();

    // Pastikan halaman termuat
    await expect(page.locator('h1:has-text("Katalog & Stok Produk")')).toBeVisible({ timeout: 10000 });
  });

  test('1. Menampilkan header, kartu status stok ringkas, dan daftar produk', async ({ page }) => {
    // Verifikasi 4 Kartu Status
    await expect(page.locator('text=Semua Produk')).toBeVisible();
    await expect(page.locator('text=Stok Tersedia')).toBeVisible();
    await expect(page.locator('text=Stok Menipis')).toBeVisible();
    await expect(page.locator('text=Habis Terjual')).toBeVisible();

    // Verifikasi Produk MOCK muncul di tabel
    await expect(page.locator('text=Kemeja Flanel Casual Premium')).toBeVisible();
    await expect(page.locator('text=Kopi Arabika Gayo Natural 250gr')).toBeVisible();
    await expect(page.locator('text=Tumbler Stainless Steel 500ml')).toBeVisible();
  });

  test('2. Case Deskripsi Sangat Panjang: UI terlindungi (clamp) dan dapat dibuka via modal', async ({ page }) => {
    // Produk dengan deskripsi panjang harus memiliki tombol "Baca selengkapnya"
    const readMoreBtn = page.locator('button:has-text("Baca selengkapnya")').first();
    await expect(readMoreBtn).toBeVisible();

    // Klik tombol baca selengkapnya
    await readMoreBtn.click();

    // Modal deskripsi lengkap harus terbuka
    await expect(page.locator('text=Deskripsi Lengkap Produk')).toBeVisible();
    await expect(
      page.locator('[role="dialog"]').getByText('Kemeja flanel lengan panjang premium')
    ).toBeVisible();

    // Tutup dialog
    await page.locator('[role="dialog"] button:has-text("Tutup")').click();
    await expect(page.locator('text=Deskripsi Lengkap Produk')).not.toBeVisible();
  });

  test('3. Case Variasi Multi-SKU (Shopee Style): badge variasi dapat diklik & tampilkan popover rincian', async ({ page }) => {
    // Tombol variasi di baris produk pertama
    const varBtn = page.locator('button:has-text("3 Variasi")').first();
    await expect(varBtn).toBeVisible();

    // Buka rincian variasi
    await varBtn.click();

    // Dialog rincian variasi harus terbuka
    await expect(page.locator('text=Rincian Variasi Produk')).toBeVisible();
    await expect(page.locator('text=Hitam - M')).toBeVisible();
    await expect(page.locator('text=Hitam - L')).toBeVisible();
    await expect(page.locator('text=Merah - XL')).toBeVisible();

    // Tutup dialog variasi
    await page.locator('button:has-text("Tutup")').click();
    await expect(page.locator('text=Rincian Variasi Produk')).not.toBeVisible();
  });

  test('4. Filter Status & Pencarian Produk Real-Time', async ({ page }) => {
    // Klik kartu "Stok Menipis"
    const lowStockCard = page.locator('text=Stok Menipis').first();
    await lowStockCard.click();

    // Hanya produk kopi Arabika (stok 2) yang muncul
    await expect(page.locator('text=Kopi Arabika Gayo Natural 250gr')).toBeVisible();
    await expect(page.locator('text=Kemeja Flanel Casual Premium')).not.toBeVisible();

    // Kembalikan ke "Semua Produk"
    await page.locator('text=Semua Produk').first().click();
    await expect(page.locator('text=Kemeja Flanel Casual Premium')).toBeVisible();

    // Coba pencarian dengan keyword
    const searchInput = page.locator('input[placeholder*="Cari nama produk"]').first();
    await searchInput.fill('Tumbler');

    await expect(page.locator('text=Tumbler Stainless Steel 500ml')).toBeVisible();
    await expect(page.locator('text=Kemeja Flanel Casual Premium')).not.toBeVisible();
  });

  test('5. Media Produk Terikat: upload multi-foto & video di form, badge media & modal galeri produk', async ({ page }) => {
    // 1. Verifikasi badge media produk pada tabel (Kemeja memiliki 2 foto)
    const photoBadge = page.locator('text=2 foto').first();
    await expect(photoBadge).toBeVisible();

    // 2. Klik badge foto untuk membuka modal media produk
    await photoBadge.click();
    await expect(page.locator('text=Media Produk: Kemeja Flanel Casual Premium')).toBeVisible();
    await expect(page.locator('text=Galeri Foto (2)')).toBeVisible();

    // Tutup dialog media produk
    await page.locator('[role="dialog"] button:has-text("Tutup")').click();
    await expect(page.locator('text=Media Produk: Kemeja Flanel Casual Premium')).not.toBeVisible();

    // 3. Buka modal tambah produk untuk memastikan upload foto & video ada di dalam form
    await page.locator('button:has-text("Tambah Produk Baru")').click();
    await expect(page.locator('text=Foto Produk (Bisa > 1 Foto)')).toBeVisible();
    await expect(page.locator('text=Video Demo Produk (Opsional)')).toBeVisible();

    // Tutup modal form
    await page.locator('[role="dialog"] button:has-text("Batal")').click();
  });

  test('6. Tambah Produk: harga format IDR di form, payload POST price number, modal tertutup & toast sukses', async ({ page }) => {
    await page.locator('button:has-text("Tambah Produk Baru")').click();
    await expect(page.locator('text=Tambah Produk Baru').last()).toBeVisible();

    await page.getByPlaceholder('Contoh: Kemeja Flanel Casual Pria').fill('Produk E2E Baru');
    await page.getByPlaceholder('Contoh: Pakaian, Makanan & Minuman, Aksesoris').fill('E2E Test');

    // Harga: ketik angka mentah, form menampilkan format Indonesia
    const priceInput = page.locator('input[inputmode="numeric"]').first();
    await priceInput.fill('250000000');
    await expect(priceInput).toHaveValue('250.000.000');

    await page.locator('input[type="number"]').first().fill('10');

    const postReqPromise = page.waitForRequest(
      (r) => r.method() === 'POST' && /\/api\/v1\/tenant\/[^/]+\/products$/.test(new URL(r.url()).pathname)
    );
    await page.locator('button:has-text("Simpan Produk")').click();
    const postReq = await postReqPromise;
    const body = postReq.postDataJSON();
    expect(body.name).toBe('Produk E2E Baru');
    expect(body.category).toBe('E2E Test');
    expect(body.price).toBe(250000000);
    expect(typeof body.price).toBe('number');
    expect(body.stock).toBe(10);

    // Modal tertutup & toast sukses (operasi background, UI tidak blocking)
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await expect(page.getByText('Produk baru berhasil ditambahkan!')).toBeVisible();
  });

  test('7. Edit Produk: form ter-prefill, harga tampil terformat, PATCH payload price number', async ({ page }) => {
    // Kopi Arabika tidak punya variasi — field Harga Satuan tampil
    const row = page.locator('tr', { hasText: 'Kopi Arabika Gayo Natural 250gr' });
    await row.locator('td').last().locator('button').first().click();

    await expect(page.locator('text=Edit Produk & Variasi').last()).toBeVisible();
    await expect(page.getByPlaceholder('Contoh: Kemeja Flanel Casual Pria')).toHaveValue('Kopi Arabika Gayo Natural 250gr');
    await expect(page.getByPlaceholder('Contoh: Pakaian, Makanan & Minuman, Aksesoris')).toHaveValue('Makanan & Minuman');

    // Harga prefill terformat gaya Indonesia
    const priceInput = page.locator('input[inputmode="numeric"]').first();
    await expect(priceInput).toHaveValue('85.000');

    await priceInput.fill('90000');
    await expect(priceInput).toHaveValue('90.000');

    const patchReqPromise = page.waitForRequest(
      (r) => r.method() === 'PATCH' && r.url().includes('/products/')
    );
    await page.locator('button:has-text("Simpan Perubahan")').click();

    // Modal tertutup = operasi background ter-trigger (sinyal durable, tidak race dgn toast)
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    // Payload PATCH membawa price number (hasil parseIdr dari input terformat)
    const patchReq = await patchReqPromise;
    const body = patchReq.postDataJSON();
    expect(body.price).toBe(90000);
    expect(typeof body.price).toBe('number');
    expect(body.name).toBe('Kopi Arabika Gayo Natural 250gr');
  });

  test('8. Hapus Produk: ConfirmDialog muncul, batal tidak menghapus, konfirmasi kirim DELETE', async ({ page }) => {
    const row = page.locator('tr', { hasText: 'Tumbler Stainless Steel 500ml' });
    const deleteBtn = row.locator('td').last().locator('button').last();

    // Buka dialog konfirmasi
    await deleteBtn.click();
    await expect(page.locator('text=Hapus Produk Ini?')).toBeVisible();
    await expect(page.locator('text=Produk yang dihapus tidak akan lagi dikenali oleh bot AI')).toBeVisible();

    // Batal: dialog tertutup, TIDAK ada request DELETE
    let deleteCalled = false;
    page.on('request', (r) => { if (r.method() === 'DELETE') deleteCalled = true; });
    await page.locator('[role="alertdialog"] button:has-text("Batal")').click();
    await expect(page.locator('text=Hapus Produk Ini?')).not.toBeVisible();
    await page.waitForTimeout(700);
    expect(deleteCalled).toBe(false);

    // Konfirmasi: DELETE terkirim & toast sukses
    await deleteBtn.click();
    await expect(page.locator('text=Hapus Produk Ini?')).toBeVisible();
    const delReqPromise = page.waitForRequest((r) => r.method() === 'DELETE' && r.url().includes('/products/'));
    await page.locator('[role="alertdialog"] button:has-text("Ya, Hapus Produk")').click();

    // ConfirmDialog tertutup = aksi ter-trigger (sinyal durable, tidak race dgn toast)
    await expect(page.locator('[role="alertdialog"]')).toHaveCount(0);
    await delReqPromise;
  });

  test('9. Variasi: tambah & hapus pilihan variasi, total stok footer dihitung ulang', async ({ page }) => {
    const row = page.locator('tr', { hasText: 'Kemeja Flanel Casual Premium' });
    await row.locator('td').last().locator('button').first().click();

    await expect(page.locator('text=Edit Produk & Variasi').last()).toBeVisible();

    // Baris variasi = div.flex yang membungkus input "Nama opsi" (hanya ada di dalam modal edit)
    const varRows = page
      .locator('[role="dialog"] div.flex:has(input[placeholder*="Nama opsi"])')
      .filter({ has: page.locator('input[placeholder="Stok"]') });
    await expect(varRows).toHaveCount(3);
    await expect(page.locator('text=Total Stok Variasi:')).toBeVisible();
    await expect(page.locator('text=42 unit')).toBeVisible();

    // Tambah pilihan → 4 baris (stok baris baru 0, total tetap 42)
    await page.locator('button:has-text("Tambah Pilihan")').click();
    await expect(varRows).toHaveCount(4);
    await expect(page.locator('text=42 unit')).toBeVisible();

    // Hapus baris "Merah - XL" (stok 7) → total wajib recompute jadi 35
    await varRows.nth(2).locator('button').last().click();
    await expect(varRows).toHaveCount(3);
    await expect(page.locator('text=35 unit')).toBeVisible();
  });

  test('10. Validasi URL Foto Manual: URL invalid ditolak dengan toast, URL valid masuk daftar foto', async ({ page }) => {
    await page.locator('button:has-text("Tambah Produk Baru")').click();
    const urlInput = page.getByPlaceholder('Atau tempel link URL foto...');
    const addBtn = page.getByRole('button', { name: 'Tambah', exact: true });

    // URL invalid → ditolak
    await urlInput.fill('bukan-url-valid');
    await addBtn.click();
    await expect(page.getByText('URL tidak valid. Harus diawali http://, https://, atau /')).toBeVisible();
    await expect(page.locator('text=0 foto terpilih')).toBeVisible();

    // URL valid → masuk daftar + input deskripsi muncul
    await urlInput.fill('https://example.com/produk.jpg');
    await addBtn.click();
    await expect(page.locator('text=1 foto terpilih')).toBeVisible();
    await expect(page.locator('input[placeholder*="Deskripsi foto"]')).toBeVisible();
  });

  test('11. Empty state pencarian tanpa hasil & fetch gagal tidak merusak UI (fallback demo)', async ({ page }) => {
    // Pencarian tanpa hasil → empty state dengan CTA
    const searchInput = page.locator('input[placeholder*="Cari nama produk"]').first();
    await searchInput.fill('produk-yang-tidak-ada-xyz');
    await expect(page.locator('text=Belum ada produk ditemukan')).toBeVisible();
    await expect(page.locator('text=Tambahkan produk pertama Anda untuk mulai mengotomasi')).toBeVisible();

    // Kembalikan → daftar pulih
    await searchInput.fill('');
    await expect(page.locator('text=Kemeja Flanel Casual Premium')).toBeVisible();

    // Fetch gagal (500) → mode demo fallback ke mock, halaman tetap utuh
    await page.route('**/api/v1/tenant/*/products*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' });
      } else {
        await route.fallback();
      }
    });
    await page.locator('button:has-text("Refresh")').click();
    await expect(page.locator('h1:has-text("Katalog & Stok Produk")')).toBeVisible();
    await expect(page.locator('text=Kemeja Flanel Casual Premium')).toBeVisible();
  });

  test('12. Filter Kategori + Pencarian kombinasi real-time', async ({ page }) => {
    const select = page.locator('select');
    await expect(select).toBeVisible();
    const searchInput = page.locator('input[placeholder*="Cari nama produk"]').first();

    // Filter kategori
    await select.selectOption('Makanan & Minuman');
    await expect(page.locator('text=Kopi Arabika Gayo Natural 250gr')).toBeVisible();
    await expect(page.locator('tr', { hasText: 'Kemeja Flanel Casual Premium' })).toHaveCount(0);

    // Pencarian dalam kategori terpilih (match kategori "Makanan & Minuman" juga match deskripsi/ nama)
    await searchInput.fill('arabika');
    await expect(page.locator('text=Kopi Arabika Gayo Natural 250gr')).toBeVisible();

    // Pencarian yang tidak ada di kategori terpilih → empty state
    await searchInput.fill('tumbler');
    await expect(page.locator('text=Belum ada produk ditemukan')).toBeVisible();

    // Reset keduanya → semua produk kembali
    await searchInput.fill('');
    await select.selectOption('all');
    await expect(page.locator('text=Tumbler Stainless Steel 500ml')).toBeVisible();
    await expect(page.locator('text=Kemeja Flanel Casual Premium')).toBeVisible();
  });

  test('13. Tier Gating Video: plan lite melihat badge Paket Silver+ & input upload terkunci', async ({ page }) => {
    // Override quota ke plan lite + bersihkan cache plan di localStorage
    await page.route('**/api/v1/tenant/clients/*/quota*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ plan: 'lite', maxMau: 50, maxAiResponses: 500 }),
      });
    });
    await page.evaluate(() => localStorage.clear());

    // Login ulang & navigasi (localStorage ter-reset)
    await loginAsDemoManager(page);
    await page.locator('button:has-text("Katalog Produk")').first().click();
    await expect(page.locator('h1:has-text("Katalog & Stok Produk")')).toBeVisible({ timeout: 10000 });

    // Buka form → video section terkunci
    await page.locator('button:has-text("Tambah Produk Baru")').click();
    await expect(page.locator('text=Video Demo Produk (Opsional)')).toBeVisible();
    await expect(page.locator('text=Paket Silver+').last()).toBeVisible();
    await expect(page.locator('text=Upload video produk tersedia mulai paket Silver')).toBeVisible();
    await expect(page.locator('text=Pilih File Video (.mp4)')).not.toBeVisible();

    // Foto upload tetap terbuka (tidak digating)
    await expect(page.locator('text=+ Pilih / Upload Foto')).toBeVisible();
  });
});
