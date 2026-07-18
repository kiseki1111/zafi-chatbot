const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const text = `SYARAT PEMBELIAN (TUNAI & KPR)

1. Persyaratan Berkas Umum (Cash / KPR):
- KTP (Suami & Istri jika sudah menikah)
- Kartu Keluarga (KK)
- NPWP Pribadi
- Buku Nikah (jika sudah menikah) atau Akta Cerai

2. Tambahan Persyaratan KPR (Karyawan):
- Slip Gaji 3 bulan terakhir
- Rekening Koran (Buku Tabungan) 3-6 bulan terakhir
- Surat Keterangan Kerja (Karyawan Tetap)
- Pas Foto Pemohon & Pasangan (3x4 / 4x6)

3. Tambahan Persyaratan KPR (Wirausaha):
- Rekening Koran 3-6 bulan terakhir
- Legalitas Usaha (NIB / SIUP / TDP)
- Laporan Keuangan / Catatan pembukuan usaha
- Pas Foto Pemohon & Pasangan

4. Tahapan Transaksi (Sekadar Info untuk Customer):
- SPR (Surat Pemesanan Rumah): Diterbitkan saat customer membayar Booking Fee/Tanda Jadi.
- PPJB: Perjanjian awal yang mengikat harga dan cara bayar.
- AJB (Akta Jual Beli): Bukti sah pemindahan hak di hadapan Notaris.

CATATAN LEGALITAS:
Semua proyek perumahan kami memiliki legalitas yang aman, terjamin, dan lengkap (SHM & IMB sudah di-split/pecah).`;

async function main() {
  await prisma.knowledgeBase.create({ data: { content: text } });
  console.log('Knowledge Base added!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
