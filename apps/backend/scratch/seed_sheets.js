const { google } = require('googleapis');
const path = require('path');

const SHEET_ID = '1ubjwLr3RL0-GA_OuoQfyRpb4hAeJaIwYY_-TfR_jyyw';
const KEY_FILE = path.join(__dirname, '..', 'zafi-project-6653fa366ab6.json');

const CUSTOMER_DATA = [
  ['Nama', 'Nomor Telepon', 'Status', 'Riwayat', 'Preferensi', 'Catatan'],
  ['Budi Santoso', '081234567890', 'Prospek Hangat', 'Pernah survei lokasi pada 12 Mei 2026', 'Rumah 2 lantai, budget 800 Juta', 'Sedang menunggu persetujuan istri'],
  ['Siti Aminah', '081987654321', 'KPR Ditolak', 'Mengajukan KPR BCA bulan lalu', 'Tipe 36 subsidi', 'BI Checking terkendala kredit motor'],
  ['Andi Wijaya', '085611223344', 'Closing', 'Membeli unit Blok A1', 'Cluster eksklusif', 'Pembayaran cash keras, serah terima bulan depan'],
  ['Rina Melati', '082233445566', 'Lead Baru', 'Bertanya via WhatsApp kemarin', 'Rumah dekat stasiun KRL', 'Belum dijadwalkan survei'],
  ['Surya Pratama', '081122334455', 'Prospek Dingin', 'Hanya tanya harga 3 bulan lalu', '-', '-'],
];

const PRODUK_DATA = [
  ['Nama Produk', 'Tipe', 'Harga', 'Luas Bangunan', 'Luas Tanah', 'Fasilitas', 'Status Ketersediaan', 'Lokasi'],
  ['Cluster Magnolia Blok A1', 'Tipe 45/60', 'Rp 650.000.000', '45 m2', '60 m2', '2 Kamar Tidur, 1 Kamar Mandi, Carport, Taman Depan', 'Sold Out', 'Jakarta Selatan'],
  ['Cluster Magnolia Blok A2', 'Tipe 45/60', 'Rp 650.000.000', '45 m2', '60 m2', '2 Kamar Tidur, 1 Kamar Mandi, Carport, Taman Depan', 'Tersedia (Ready Stock)', 'Jakarta Selatan'],
  ['Grand Estate Blok B5', 'Tipe 70/100', 'Rp 1.200.000.000', '70 m2', '100 m2', '3 Kamar Tidur, 2 Kamar Mandi, 2 Carport, Smart Home', 'Inden 6 Bulan', 'Tangerang Selatan'],
  ['Pesona Asri Tipe Subsidi', 'Tipe 36/60', 'Rp 185.000.000', '36 m2', '60 m2', '2 Kamar Tidur, 1 Kamar Mandi', 'Tersedia 5 Unit Terakhir', 'Bogor'],
  ['Ruko Emerald Kav 1', 'Komersial 2 Lantai', 'Rp 2.500.000.000', '120 m2', '60 m2', '2 Kamar Mandi, Area Parkir Luas', 'Tersedia', 'Depok'],
];

const DOKUMEN_DATA = [
  ['Tahapan', 'Pihak', 'Dokumen yang Diperlukan', 'Keterangan', 'Syarat Tambahan'],
  ['Booking Fee', 'Customer', 'KTP, NPWP', 'Fotokopi KTP suami istri (jika sudah menikah) dan NPWP pemohon', 'Wajib dibawa saat survei atau ditransfer'],
  ['Pengajuan KPR (Karyawan)', 'Customer', 'KTP, Kartu Keluarga, NPWP, Surat Nikah, Slip Gaji 3 bulan terakhir, Rekening Koran 3 bulan, Surat Keterangan Kerja', 'Kumpulkan dalam map merah muda maksimal 7 hari setelah booking fee', 'Masa kerja minimal 1 tahun di perusahaan tetap'],
  ['Pengajuan KPR (Wirausaha)', 'Customer', 'KTP, KK, NPWP, SIUP/TDP, Laporan Keuangan 6 bulan terakhir, Rekening Koran 6 bulan terakhir', 'Kumpulkan dalam map biru maksimal 7 hari setelah booking fee', 'Usaha sudah berjalan minimal 2 tahun'],
  ['Akad Kredit', 'Customer', 'Materai 10.000 (10 lembar), KTP Asli', 'Wajib hadir berdua jika suami istri', 'Tidak boleh diwakilkan'],
  ['Serah Terima Kunci', 'Developer (Perusahaan)', 'Berita Acara Serah Terima (BAST), Kunci Rumah, Buku Panduan Penghuni', 'BAST ditandatangani kedua belah pihak setelah cek fisik bangunan', 'Jika ada cacat (defect), komplain maksimal 14 hari'],
];

async function seed() {
  console.log('Authenticating with Google Sheets API...');
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });
    
    const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);
    console.log('Existing sheets:', existingSheets);

    // Create sheets if they don't exist
    const sheetsToCreate = ['customer', 'produk', 'dokumen'].filter(name => !existingSheets.includes(name));
    
    if (sheetsToCreate.length > 0) {
      console.log('Creating missing sheets:', sheetsToCreate);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: sheetsToCreate.map(title => ({
            addSheet: { properties: { title } }
          }))
        }
      });
    }

    // Populate data
    console.log('Populating customer data...');
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'customer!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: CUSTOMER_DATA },
    });

    console.log('Populating produk data...');
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'produk!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: PRODUK_DATA },
    });

    console.log('Populating dokumen data...');
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'dokumen!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: DOKUMEN_DATA },
    });

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding sheets:', error.message);
  }
}

seed();
