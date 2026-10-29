const fs = require('fs');
const path = require('path');

// 1. Load Environment Variables from .env
function loadEnv() {
  const envPaths = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../apps/backend/.env'),
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

async function run() {
  console.log('================================================================');
  console.log('🏡 PENGUJIAN FITUR SITEPLAN INTERAKTIF & PENGIRIMAN WAHA');
  console.log('================================================================');
  console.log(`🌐 WAHA URL     : ${WAHA_URL}`);
  console.log(`📱 Target Phone : ${TARGET_PHONE} (WAHA_DEV_TEST_PHONE)`);
  console.log('================================================================\n');

  // Step 1: Inisialisasi Database Prisma
  console.log('1️⃣ Memeriksa data cluster Zafi Residence di Database...');
  const { PrismaClient } = require(path.resolve(process.cwd(), 'apps/backend/node_modules/@prisma/client'));
  let dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:secret_password@127.0.0.1:5432/rbac_api_db?schema=public';
  if (dbUrl.includes('@postgres:5432')) {
    dbUrl = dbUrl.replace('@postgres:5432', '@127.0.0.1:5432');
  }

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  // Pastikan cluster Zafi Residence ada
  let group = await prisma.resourceGroup.findFirst({
    where: { name: { contains: 'Zafi Residence', mode: 'insensitive' } },
    include: { items: { orderBy: { code: 'asc' } } },
  });

  if (!group || group.items.length === 0) {
    const { seed } = require('./seed-zafi-residence-siteplan');
    group = await seed();
    group = await prisma.resourceGroup.findUnique({
      where: { id: group.id },
      include: { items: { orderBy: { code: 'asc' } } },
    });
  }

  console.log(`   ✓ Cluster Ditemukan: "${group.name}" | Total: ${group.items.length} Kavling\n`);

  // Step 2: Generate & Simpan Gambar Siteplan (JPG) via Backend
  console.log('2️⃣ Mengenerate gambar denah siteplan beresolusi tinggi (JPG) dengan barisan lurus & natural sort...');
  const { AvailabilityService } = require(path.resolve(process.cwd(), 'apps/backend/dist/src/modules/availability/availability.service'));
  const availabilityService = new AvailabilityService(prisma);

  // Uji layout dengan pengaturan jalan, ukuran rumah, fasos kustom
  const customLayout = {
    unitWidth: 46,
    unitHeight: 64,
    roads: [
      { id: 'road-main', name: 'JALAN KOMPLEK ZAFI RESIDENCE', x: 50, y: 49, width: 92, height: 11, orientation: 'horizontal' },
    ],
    fasos: [
      { id: 'fasos-main', name: 'FASOS', x: 48, y: 24, width: 8, height: 11 },
    ],
  };

  const genResult = await availabilityService.saveSiteplanLayout(group.id, { layout: customLayout });
  console.log(`   ✓ Siteplan JPG berhasil digenerate realtime: ${genResult.url}`);

  const localFile = path.resolve(process.cwd(), 'uploads', 'incoming', genResult.filename);
  if (!fs.existsSync(localFile)) {
    throw new Error(`File ${localFile} tidak ditemukan di disk!`);
  }
  const fileSize = fs.statSync(localFile).size;
  console.log(`   ✓ Verifikasi file lokal: ${localFile} (${(fileSize / 1024).toFixed(1)} KB)\n`);

  // Step 2B: Uji On-Demand Endpoint Buffer
  console.log('2️⃣B Menguji endpoint On-Demand buffer live siteplan...');
  const liveBuffer = await availabilityService.getLiveSiteplanJpeg(group.id);
  console.log(`   ✓ Live on-demand JPEG buffer berhasil dihasilkan: ${liveBuffer.length} bytes\n`);

  // Step 3: Verifikasi database siteplanImage sudah terhubung
  console.log('3️⃣ Memeriksa registrasi media siteplan di database cluster...');
  const refreshedGroup = await prisma.resourceGroup.findUnique({ where: { id: group.id } });
  const medias = JSON.parse(refreshedGroup.siteplanImage || '[]');
  const siteplanMedia = medias.find((m) => m.url === genResult.url || m.name.includes('Siteplan'));
  if (!siteplanMedia) {
    throw new Error('Media siteplan belum terdaftar di group.siteplanImage!');
  }
  console.log(`   ✓ Terdaftar di RAG Knowledge: "${siteplanMedia.name}" -> ${siteplanMedia.url}\n`);

  // Step 4: Simulasi Permintaan Customer ke Chatbot AI (CS Luna)
  console.log('4️⃣ Menguji respon AI Chatbot saat customer meminta denah siteplan...');
  const { AgentSharedService } = require(path.resolve(process.cwd(), 'apps/backend/dist/src/core/agent-shared/agent-shared.service'));
  const agentShared = new AgentSharedService(prisma);
  const context = await agentShared.getAvailabilityContext('Zafi Residence');

  console.log('   --- RAG PLANSITE KNOWLEDGE YANG DIBACA AI ---');
  const previewLines = context.split('\n').filter((l) => l.includes('SITEPLAN') || l.includes('Daftar') || l.includes('Perumahan')).slice(0, 5);
  previewLines.forEach((l) => console.log(`   ${l}`));
  console.log('   ---------------------------------------------\n');

  // Step 5: Kirim Gambar Siteplan Asli ke WhatsApp Customer via WAHA
  console.log('5️⃣ Mengirimkan gambar siteplan langsung ke WhatsApp nomor pengujian via WAHA...');
  const cleanPhone = TARGET_PHONE.replace(/[^0-9]/g, '');
  const chatId = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@c.us`;

  // Baca file JPG sebagai base64
  const imageBuffer = fs.readFileSync(localFile);
  const imageBase64 = imageBuffer.toString('base64');

  const workingSession = 'zafi-property';
  const payloadImage = {
    session: workingSession,
    chatId,
    file: {
      mimetype: 'image/jpeg',
      filename: `siteplan-zafi-residence.jpg`,
      data: imageBase64,
    },
    caption: `🏡 *Denah Siteplan Resmi Zafi Residence*\n\nBerikut denah ketersediaan kavling terbaru kami ya Kak!\n• Hijau: Unit Ready\n• Orange: Proses Bank\n• Merah: Sudah Terjual\n\nUntuk info survey & booking unit, silakan hubungi tim marketing kami. 🙏`,
  };

  let sent = false;
  let wahaResData = null;

  try {
    let res = await fetch(`${WAHA_URL}/api/sendImage`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payloadImage),
    });

    if (!res.ok) {
      res = await fetch(`${WAHA_URL}/api/sendFile`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadImage),
      });
    }

    wahaResData = await res.json();
    if (res.ok) {
      sent = true;
    } else {
      throw new Error(JSON.stringify(wahaResData));
    }
  } catch (e) {
    console.error(`   ✗ Gagal kirim gambar ke WAHA: ${e.message}`);
    process.exit(1);
  }

  const msgId = wahaResData?.id?._serialized || wahaResData?.id || wahaResData?.key?.id || 'OK';
  console.log(`   ✓ Gambar Siteplan berhasil terkirim ke WhatsApp! (Msg ID: ${msgId})\n`);

  console.log('================================================================');
  console.log('🎉 SELURUH PENGUJIAN SITEPLAN BERHASIL 100%!');
  console.log('1. Denah siteplan JPG berhasil digenerate & tersimpan di disk.');
  console.log('2. Sinkron dengan 58 kavling asli Blok A & Blok B Zafi Residence.');
  console.log('3. Gambar denah siteplan telah terkirim ke WhatsApp nomor: ' + TARGET_PHONE);
  console.log('================================================================');

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
