const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Parse .env
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

const wahaUrl = process.env.WAHA_API_URL || 'http://103.30.195.145:3060';
const wahaKey = process.env.WAHA_API_KEY || 'ZafitechDunia12345#';

const headers = {
  'Content-Type': 'application/json',
  ...(wahaKey ? { 'X-Api-Key': wahaKey } : {}),
};

async function run() {
  console.log('====================================================');
  console.log('🧪 WAHA MEDIA SENDER TEST (IMAGE & VIDEO)');
  console.log('====================================================');
  console.log(`🌐 WAHA Endpoint: ${wahaUrl}`);
  console.log(`🔑 API Key      : ${wahaKey ? '✓ Terpasang' : '✗ Tidak ada'}\n`);

  // 1. Cek Koneksi & Sesi
  console.log('1. Mengambil daftar sesi WhatsApp dari WAHA...');
  let sessions = [];
  try {
    const res = await axios.get(`${wahaUrl}/api/sessions`, { headers, timeout: 8000 });
    sessions = Array.isArray(res.data) ? res.data : [];
    console.log(`   ✓ Ditemukan ${sessions.length} sesi:`);
    sessions.forEach((s) => {
      console.log(`     - [${s.name}] Status: ${s.status} | Me: ${s.me?.id || '-'}`);
    });
  } catch (err) {
    console.error(`   ✗ Gagal konek ke WAHA:`, err.response?.data || err.message);
    return;
  }

  // Ambil argumen CLI
  const args = process.argv.slice(2);
  const targetPhone = args[0] || '6281649433281';
  const chosenSession = args[1] || sessions.find((s) => s.status?.toLowerCase() === 'working')?.name || 'Zafi-CS';

  const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
  const chatId = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@c.us`;

  console.log(`\n2. Menyiapkan pengujian kirim ke ${chatId} via sesi "${chosenSession}"...\n`);

  // Sample Media URL (H.264 & AAC standard with valid duration)
  const sampleImage = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop';
  const sampleVideo = 'https://filesamples.com/samples/video/mp4/sample_640x360.mp4';

  // TEST A: KIRIM GAMBAR (IMAGE)
  console.log('----------------------------------------------------');
  console.log('📸 TEST 1: Kirim Foto (Image)');
  console.log(`   Image URL: ${sampleImage}`);
  try {
    const payloadImage = {
      session: chosenSession,
      chatId: chatId,
      file: {
        url: sampleImage,
        filename: 'foto-siteplan-properti.jpg',
      },
      caption: '📸 [TEST] Foto Contoh Siteplan / Properti via WAHA',
    };

    let imgRes;
    try {
      imgRes = await axios.post(`${wahaUrl}/api/sendImage`, payloadImage, { headers });
    } catch (e) {
      imgRes = await axios.post(`${wahaUrl}/api/sendFile`, payloadImage, { headers });
    }

    console.log('   ✓ FOTO BERHASIL TERKIRIM!');
    console.log('   ID Pesan WhatsApp:', imgRes.data?.key?.id || 'OK');
  } catch (err) {
    console.error('   ✗ GAGAL Kirim Gambar:', err.response?.data || err.message);
  }

  // Tunggu 2 detik sebelum tes video
  console.log('\n   Menunggu jeda 2 detik...');
  await new Promise((r) => setTimeout(r, 2000));

  // TEST B: KIRIM VIDEO
  console.log('----------------------------------------------------');
  console.log('🎥 TEST 2: Kirim Video (MP4)');
  console.log(`   Video URL: ${sampleVideo}`);
  try {
    console.log('   Mengunduh buffer video agar terbebas dari blokir 403 CDN...');
    const downloadRes = await axios.get(sampleVideo, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 20000,
    });
    const base64Data = Buffer.from(downloadRes.data).toString('base64');
    console.log(`   ✓ Video diunduh (${(downloadRes.data.length / 1024).toFixed(1)} KB) -> Mengirim via /api/sendFile...`);

    const payloadVideo = {
      session: chosenSession,
      chatId: chatId,
      file: {
        mimetype: 'video/mp4',
        data: `data:video/mp4;base64,${base64Data}`,
      },
      caption: '🎥 [TEST] Video Virtual Tour Properti via WAHA',
    };

    const vidRes = await axios.post(`${wahaUrl}/api/sendVideo`, payloadVideo, {
      headers,
      timeout: 35000,
    });

    console.log('   ✓ VIDEO NATIVE (PLAYABLE) BERHASIL TERKIRIM!');
    console.log('   ID Pesan WhatsApp:', vidRes.data?.key?.id || 'OK');
  } catch (err) {
    console.error('   ✗ GAGAL Kirim Video:', err.response?.data || err.message);
  }

  console.log('\n====================================================');
  console.log('🏁 PENGUJIAN SELESAI');
  console.log('====================================================');
}

run();
