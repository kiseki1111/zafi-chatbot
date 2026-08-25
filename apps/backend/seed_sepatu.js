const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedSepatu() {
  console.log('Seeding Shoe Store Dummy Data...');

  // Ensure default tenant exists
  let tenant = await prisma.tenant.findUnique({
    where: { id: '11111111-1111-1111-1111-111111111111' }
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Zafi Property / Toko Sepatu'
      }
    });
  }

  const knowledgeEntries = [
    {
      id: '44444444-4444-4444-4444-444444444441',
      content: '[Kategori: PRODUK] Nama Produk: Sepatu Sneakers Aerostep V1, Tipe: Kasual/Olahraga Ringan, Harga: Rp 350.000, Ukuran Tersedia: 39, 40, 41, 42, 43, Warna: Hitam-Putih, Material: Mesh Breathable & Sol Karet Anti Slip, Status: Ready Stock 120 pasang. Keunggulan: Sangat ringan, cocok untuk jogging ringan dan jalan santai harian.',
      tenantId: tenant.id
    },
    {
      id: '44444444-4444-4444-4444-444444444442',
      content: '[Kategori: PRODUK] Nama Produk: Sepatu Formal Oxford Klasik, Tipe: Formal/Pantofel, Harga: Rp 550.000, Ukuran Tersedia: 40, 41, 42, 44, Warna: Coklat Tua, Hitam, Material: 100% Kulit Sapi Asli (Genuine Leather), Sol Kayu Lapis Karet, Status: Sisa 15 pasang. Keunggulan: Desain elegan untuk ngantor atau acara resmi, awet hingga 5 tahun dengan perawatan rutin.',
      tenantId: tenant.id
    },
    {
      id: '44444444-4444-4444-4444-444444444443',
      content: '[Kategori: PRODUK] Nama Produk: Sepatu Lari Marathon Ultra X, Tipe: Profesional Running, Harga: Rp 899.000, Ukuran Tersedia: 38, 39, 40, 41, 42, Warna: Neon Hijau, Biru Navy, Material: Flyknit lentur dengan bantalan Foam Cloud Tech, Status: Pre-Order (Estimasi 7 hari kerja). Keunggulan: Meredam benturan 40% lebih baik, cocok untuk lari jarak jauh di aspal.',
      tenantId: tenant.id
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      content: '[Kategori: PRODUK] Nama Produk: Sepatu Boots Gunung TrackMaster, Tipe: Outdoor/Hiking, Harga: Rp 720.000, Ukuran Tersedia: 41, 42, 43, 44, 45, Warna: Hijau Army, Coklat Pasir, Material: Kanvas Tebal Waterproof & Sol Bergerigi Tajam, Status: Ready Stock 45 pasang. Keunggulan: Tahan air (Waterproof), grip kuat untuk medan lumpur dan bebatuan, pelindung jari kaki berbahan baja ringan.',
      tenantId: tenant.id
    },
    {
      id: '44444444-4444-4444-4444-444444444445',
      content: '[Kategori: PRODUK] Nama Produk: Sandal Santai Slip-on Comfy, Tipe: Sandal Pria/Wanita, Harga: Rp 120.000, Ukuran Tersedia: 37 hingga 43, Warna: Hitam, Abu-abu, Putih, Material: EVA Foam Empuk, Status: Ready Stock 300 pasang. Keunggulan: Sangat empuk, anti air, mudah dicuci, cocok untuk dipakai di rumah atau jalan santai sekitar komplek.',
      tenantId: tenant.id
    },
    {
      id: '44444444-4444-4444-4444-444444444446',
      content: '[Kategori: FAQ & KEBIJAKAN TOKO] Kebijakan Retur & Penukaran Ukuran: Pelanggan diperbolehkan menukar ukuran sepatu maksimal 3x24 jam setelah barang diterima (berdasarkan resi ekspedisi). Syaratnya: Sepatu belum dipakai keluar rumah, tag merek masih terpasang, dan kardus tidak rusak parah. Ongkos kirim bolak-balik ditanggung oleh pembeli, kecuali jika kesalahan pengiriman ada pada pihak toko.',
      tenantId: tenant.id
    },
    {
      id: '44444444-4444-4444-4444-444444444447',
      content: '[Kategori: FAQ & KEBIJAKAN TOKO] Jam Operasional & Jadwal Pengiriman Toko Sepatu: Toko buka setiap hari Senin - Sabtu pukul 09.00 hingga 17.00 WIB. Hari Minggu libur pengiriman tapi tetap melayani chat. Pesanan yang masuk sebelum jam 15.00 WIB akan dikirim di hari yang sama. Pesanan via Gosend/Grab Instant maksimal masuk jam 16.00 WIB.',
      tenantId: tenant.id
    },
    {
      id: '44444444-4444-4444-4444-444444444448',
      content: '[Kategori: PROMO & DISKON] Promo Bulan Ini (Juli 2026): 1) Diskon 15% untuk pembelian kedua produk Sepatu Formal. 2) Gratis Ongkir hingga Rp 25.000 ke seluruh Indonesia dengan minimal belanja Rp 300.000. 3) Bundling Sepatu Sneakers + Kaos Kaki Premium hanya Rp 365.000 (Lebih hemat Rp 35.000).',
      tenantId: tenant.id
    },
    {
      id: '44444444-4444-4444-4444-444444444449',
      content: '[Kategori: TIPS & PERAWATAN] Cara Merawat Sepatu Kulit Asli (Pantofel): 1) Jangan dicuci dengan air basah kuyup, cukup lap dengan kain microfiber lembab. 2) Gunakan semir sepatu berbahan dasar wax (lilin) seminggu sekali agar kulit tetap lembab dan tidak retak. 3) Simpan di tempat kering dengan silica gel atau di ruangan ber-AC. Hindari paparan sinar matahari langsung.',
      tenantId: tenant.id
    },
    {
      id: '44444444-4444-4444-4444-444444444450',
      content: '[Kategori: PANDUAN UKURAN / SIZE CHART] Panduan Panjang Kaki (Insole): Size 38 = 24 cm, Size 39 = 24.5 cm, Size 40 = 25 cm, Size 41 = 26 cm, Size 42 = 26.5 cm, Size 43 = 27.5 cm, Size 44 = 28 cm. Saran: Jika kaki pelanggan bertipe lebar (wide), disarankan naik 1 nomor dari ukuran normal.',
      tenantId: tenant.id
    }
  ];

  for (const entry of knowledgeEntries) {
    await prisma.knowledgeBase.upsert({
      where: { id: entry.id },
      update: { content: entry.content },
      create: {
        id: entry.id,
        content: entry.content,
        tenantId: entry.tenantId,
      }
    });
  }

  console.log('Successfully inserted 10 comprehensive dummy entries for Shoe Store.');
}

seedSepatu()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
