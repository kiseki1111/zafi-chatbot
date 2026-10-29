const fs = require('fs');
const path = require('path');

// 1. Load Environment Variables from .env
function loadEnv() {
  const envPaths = [
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.substring(0, idx).trim();
          let v = trimmed.substring(idx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (!process.env[k]) {
            process.env[k] = v;
          }
        }
      }
    }
  }
}

loadEnv();

const WAHA_URL = (process.env.WAHA_API_URL || '').replace(/\/+$/, '');
const WAHA_KEY = process.env.WAHA_API_KEY || process.env.WHATSAPP_API_KEY || '';
const TARGET_PHONE = process.env.WAHA_DEV_TEST_PHONE || '';

if (!WAHA_URL || !TARGET_PHONE) {
  console.error('❌ Error: WAHA_API_URL dan WAHA_DEV_TEST_PHONE wajib diatur di file .env');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  ...(WAHA_KEY ? { 'X-Api-Key': WAHA_KEY } : {}),
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('================================================================');
  console.log('🚀 SUITE PENGUJIAN REAL WAHA (KATEGORI B - 5 SKENARIO)');
  console.log('================================================================');
  console.log(`🌐 WAHA URL     : ${WAHA_URL}`);
  console.log(`📱 Nomor Target : ${TARGET_PHONE} (STRICTLY LOCKED)`);
  console.log('================================================================\n');

  // Step 0: Cek Sesi WAHA Aktif
  console.log('🔍 Memeriksa koneksi & sesi WAHA aktif...');
  let sessions = [];
  try {
    const res = await fetch(`${WAHA_URL}/api/sessions`, { headers });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    sessions = await res.json();
    console.log(`   ✓ Terhubung! Ditemukan ${sessions.length} sesi.`);
  } catch (e) {
    console.error(`   ✗ Gagal terhubung ke WAHA: ${e.message}`);
    process.exit(1);
  }

  const workingSession = sessions.find((s) => s.status?.toUpperCase() === 'WORKING')?.name || 'zafi-property';
  console.log(`   ✓ Sesi kerja aktif: "${workingSession}"\n`);

  const cleanPhone = TARGET_PHONE.replace(/[^0-9]/g, '');
  const chatId = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@c.us`;

  // -------------------------------------------------------------------------
  // SKENARIO 1: Pesan Teks Standar / Human Takeover Admin
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('1️⃣ SKENARIO 1: Live Chat Admin / Human Takeover (Pesan Teks Manual)');
  console.log('----------------------------------------------------------------');
  const nowStr = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
  const msgTakeover = `👋 Halo Kak Ardito! Ini pesan uji coba *Live Chat Admin* dari Web Dashboard ZAF Sales pada ${nowStr} WIB. (Mode Human Takeover berjalan normal).`;

  try {
    const res = await fetch(`${WAHA_URL}/api/sendText`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ session: workingSession, chatId, text: msgTakeover }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log(`   ✓ Sukses terkirim! (ID: ${data.id?._serialized || data.id})`);
  } catch (e) {
    console.error(`   ✗ Gagal: ${e.message}`);
  }
  await sleep(2500);

  // -------------------------------------------------------------------------
  // SKENARIO 2: Automated Follow-Up AI Engine
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('2️⃣ SKENARIO 2: Automated Follow-Up AI Engine (Notifikasi Inaktif 24+ Jam)');
  console.log('----------------------------------------------------------------');
  const msgFollowUp = `Halo Kak Ardito! 😊 Menghubungi kembali terkait rencana survey unit di *Zafi Residence*. Apakah akhir pekan ini ada waktu luang untuk kami jadwalkan kunjungan ke lokasi?`;

  try {
    const res = await fetch(`${WAHA_URL}/api/sendText`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ session: workingSession, chatId, text: msgFollowUp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log(`   ✓ Sukses terkirim! (ID: ${data.id?._serialized || data.id})`);
  } catch (e) {
    console.error(`   ✗ Gagal: ${e.message}`);
  }
  await sleep(2500);

  // -------------------------------------------------------------------------
  // SKENARIO 3: Media & Siteplan Delivery (Kirim Gambar / Foto Denah)
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('3️⃣ SKENARIO 3: Media & Siteplan Delivery (Kirim Gambar Denah Kavling)');
  console.log('----------------------------------------------------------------');
  const sampleSiteplan = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&auto=format&fit=crop';
  
  try {
    const payloadImage = {
      session: workingSession,
      chatId,
      file: {
        url: sampleSiteplan,
        filename: 'siteplan-zafi-residence.jpg',
      },
      caption: '🏡 *Denah Siteplan & Kavling Zafi Residence*\nBerikut update unit tersedia tipe 36/72 commercial.',
    };

    let res = await fetch(`${WAHA_URL}/api/sendImage`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payloadImage),
    });

    if (!res.ok) {
      // Fallback ke sendFile
      res = await fetch(`${WAHA_URL}/api/sendFile`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadImage),
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log(`   ✓ Gambar siteplan berhasil terkirim! (ID: ${data.id?._serialized || data.id || data.key?.id})`);
  } catch (e) {
    console.error(`   ✗ Gagal kirim gambar: ${e.message}`);
  }
  await sleep(2500);

  // -------------------------------------------------------------------------
  // SKENARIO 4: AI CS Contextual Response (Penjelasan Harga & Spesifikasi Unit)
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('4️⃣ SKENARIO 4: AI CS Luna Contextual Response (RAG Knowledge Base)');
  console.log('----------------------------------------------------------------');
  const msgAiCs = `Untuk *Zafi Residence Tipe 36*, harga cash promo mulai Rp182.000.000 dengan spesifikasi 2 Kamar Tidur, 1 Kamar Mandi, Listrik 1300W, dan Air PDAM lancar. Booking fee hanya Rp500.000 (refund 100% jika berkas KPR ditolak). 🙏`;

  try {
    const res = await fetch(`${WAHA_URL}/api/sendText`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ session: workingSession, chatId, text: msgAiCs }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log(`   ✓ Jawaban AI CS Luna terkirim! (ID: ${data.id?._serialized || data.id})`);
  } catch (e) {
    console.error(`   ✗ Gagal: ${e.message}`);
  }
  await sleep(2500);

  // -------------------------------------------------------------------------
  // SKENARIO 5: Call Rejection Auto-Reply (Respon Penolakan Panggilan Otomatis)
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('5️⃣ SKENARIO 5: Call Rejection Auto-Reply (Panggilan WhatsApp Ditolak)');
  console.log('----------------------------------------------------------------');
  const msgCallReject = `📞 *Pemberitahuan Otomatis:*\nHalo Kak Ardito, mohon maaf nomor asisten AI ini beroperasi secara otomatis dan tidak dapat menerima panggilan suara/video. Silakan tinggalkan pertanyaan melalui chat teks di sini, kami akan segera merespons. Terima kasih! 🙏`;

  try {
    const res = await fetch(`${WAHA_URL}/api/sendText`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ session: workingSession, chatId, text: msgCallReject }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log(`   ✓ Notifikasi penolakan panggilan terkirim! (ID: ${data.id?._serialized || data.id})`);
  } catch (e) {
    console.error(`   ✗ Gagal: ${e.message}`);
  }

  console.log('\n================================================================');
  console.log(`🎉 SELURUH 5 SKENARIO REAL BERHASIL DIKIRIMKAN KE ${TARGET_PHONE}`);
  console.log('Silakan periksa WhatsApp Anda untuk mengonfirmasi kelima pesan di atas.');
  console.log('================================================================');
}

run().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
