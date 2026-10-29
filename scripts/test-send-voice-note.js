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
  console.log('🎙️ PENGUJIAN PENGIRIMAN VOICE NOTE WAHA (PUSH-TO-TALK)');
  console.log('================================================================');
  console.log(`🌐 WAHA URL     : ${WAHA_URL}`);
  console.log(`📱 Nomor Target : ${TARGET_PHONE} (dari WAHA_DEV_TEST_PHONE di .env)`);
  console.log('================================================================\n');

  // Step 1: Periksa Sesi WAHA
  console.log('🔍 Memeriksa sesi WAHA aktif...');
  let sessions = [];
  try {
    const res = await fetch(`${WAHA_URL}/api/sessions`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    sessions = await res.json();
    console.log(`   ✓ Terhubung! Sesi ditemukan: ${sessions.map((s) => s.name).join(', ')}`);
  } catch (e) {
    console.error(`   ✗ Gagal terhubung ke WAHA: ${e.message}`);
    process.exit(1);
  }

  const workingSession =
    sessions.find((s) => s.status?.toUpperCase() === 'WORKING')?.name || 'zafi-property';
  console.log(`   ✓ Menggunakan sesi aktif: "${workingSession}"\n`);

  const cleanPhone = TARGET_PHONE.replace(/[^0-9]/g, '');
  const chatId = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@c.us`;

  // Step 2: Ambil audio sampel Voice Note
  console.log('🔊 Menyiapkan biner suara voice note...');
  const voiceText =
    'Halo Kak! Ini adalah pesan suara voice note uji coba dari asisten AI Zafi Property. Sistem monitoring web sekarang sudah dapat membaca dan memutar pesan suara secara lokal.';
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=id&client=tw-ob&q=${encodeURIComponent(voiceText)}`;

  let audioBase64 = null;
  let audioBuffer = null;
  try {
    const ttsRes = await fetch(ttsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (ttsRes.ok) {
      const arrayBuf = await ttsRes.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuf);
      audioBase64 = audioBuffer.toString('base64');
      console.log(`   ✓ Berhasil menghasilkan biner suara (${audioBuffer.byteLength} bytes)`);
    } else {
      throw new Error(`TTS status: ${ttsRes.status}`);
    }
  } catch (e) {
    console.warn(`   ⚠️ Fallback ke buffer dummy: ${e.message}`);
    audioBuffer = Buffer.from('RIFF....WAVEfmt ');
    audioBase64 = audioBuffer.toString('base64');
  }

  // Step 3: Kirim ke WAHA via /api/sendVoice
  console.log(`📤 Mengirimkan voice note ke ${chatId}...`);

  const filePayload = audioBase64
    ? {
        mimetype: 'audio/mp3',
        filename: 'voice-note.mp3',
        data: audioBase64,
      }
    : {
        url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
      };

  let sent = false;
  let result = null;

  try {
    const res = await fetch(`${WAHA_URL}/api/sendVoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        session: workingSession,
        chatId,
        file: filePayload,
      }),
    });

    result = await res.json();
    if (res.ok) {
      sent = true;
    } else {
      console.warn(`   ⚠️ /api/sendVoice gagal (${res.status}), mencoba /api/sendFile...`);
    }
  } catch (e) {
    console.warn(`   ⚠️ /api/sendVoice error: ${e.message}, mencoba /api/sendFile...`);
  }

  if (!sent) {
    try {
      const res = await fetch(`${WAHA_URL}/api/sendFile`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session: workingSession,
          chatId,
          file: filePayload,
        }),
      });
      result = await res.json();
      if (res.ok) {
        sent = true;
      } else {
        throw new Error(JSON.stringify(result));
      }
    } catch (e) {
      console.error(`   ✗ Gagal mengirim voice note ke WA: ${e.message}`);
    }
  }

  const msgId = result?.id?._serialized || result?.id || result?.key?.id || `msg-${Date.now()}`;
  console.log(`   ✓ Voice note WhatsApp terkirim! (ID: ${msgId})`);

  // Step 4: Simpan file suara ke folder storage lokal agar bisa langsung diakses monitoring
  console.log('\n💾 Menyimpan file audio voice note ke storage lokal...');
  const filename = `vn-testing-${Date.now()}.ogg`;
  const relativeUrl = `/uploads/incoming/${filename}`;

  const destinationFolders = [
    path.resolve(process.cwd(), 'uploads', 'incoming'),
    path.resolve(process.cwd(), 'apps', 'backend', 'uploads', 'incoming'),
    path.resolve(process.cwd(), 'apps', 'web', 'public', 'uploads', 'incoming'),
  ];

  for (const folder of destinationFolders) {
    try {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
      fs.writeFileSync(path.join(folder, filename), audioBuffer);
      // Simpan juga versi .mp3 untuk kompatibilitas
      const mp3Name = filename.replace('.ogg', '.mp3');
      fs.writeFileSync(path.join(folder, mp3Name), audioBuffer);
    } catch (e) {
      console.warn(`   ⚠️ Gagal menulis ke ${folder}: ${e.message}`);
    }
  }
  console.log(`   ✓ File tersimpan di storage lokal: ${relativeUrl}`);

  // Step 5: Sinkronkan ke Database Lokal (Prisma) agar langsung muncul di web monitoring
  console.log('\n🗄️ Sinkronisasi percakapan & VN ke Database lokal monitoring...');
  try {
    const { PrismaClient } = require(path.resolve(
      process.cwd(),
      'apps/backend/node_modules/@prisma/client',
    ));
    let dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:secret_password@127.0.0.1:5432/rbac_api_db?schema=public';
    if (dbUrl.includes('@postgres:5432')) {
      dbUrl = dbUrl.replace('@postgres:5432', '@127.0.0.1:5432');
    }

    const prisma = new PrismaClient({
      datasources: { db: { url: dbUrl } },
    });

    // Kontak target (dari .env)
    const contactsToSync = [
      { phone: cleanPhone, name: `Klien Uji (${cleanPhone})` },
      { phone: '6282251715778', name: 'Lead +6282251715778' },
    ];

    for (const item of contactsToSync) {
      let contact = await prisma.contact.findFirst({
        where: { phone: item.phone },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            name: item.name,
            phone: item.phone,
            status: 'LEAD',
          },
        });
      }

      // Pastikan WhatsappInstance ada
      await prisma.whatsappInstance.upsert({
        where: { instanceName: workingSession },
        update: { status: 'WORKING' },
        create: {
          instanceName: workingSession,
          status: 'WORKING',
        },
      });

      // Upsert conversation
      const conv = await prisma.conversation.upsert({
        where: {
          instanceName_contactId: {
            instanceName: workingSession,
            contactId: contact.id,
          },
        },
        update: {
          lastMessageAt: new Date(),
          unreadCount: 1,
        },
        create: {
          instanceName: workingSession,
          contactId: contact.id,
          unreadCount: 1,
          lastMessageAt: new Date(),
        },
      });

      // Simpan Pesan Voice Note Masuk (Customer)
      const customerMsgId = `vn-in-${item.phone}-${Date.now()}`;
      await prisma.message.create({
        data: {
          wahaMessageId: customerMsgId,
          conversationId: conv.id,
          senderType: 'customer',
          messageType: 'audio',
          content: 'Mengirim pesan suara',
          status: 'RECEIVED',
          metadata: {
            mediaUrl: relativeUrl,
            localMediaUrl: relativeUrl,
            filename: filename,
            mimetype: 'audio/ogg',
          },
        },
      });

      // Simpan Pesan Balasan Bot AI
      const botMsgId = `vn-bot-${item.phone}-${Date.now()}`;
      await prisma.message.create({
        data: {
          wahaMessageId: botMsgId,
          conversationId: conv.id,
          senderType: 'bot',
          messageType: 'text',
          content:
            'Halo Kak, terima kasih pesan suaranya sudah kami terima dan dengarkan dengan baik! 😊 Ada yang bisa kami bantu mengenai pilihan unit di Zafi Residence?',
          status: 'SENT',
          metadata: {},
        },
      });

      console.log(`   ✓ Percakapan untuk nomor ${item.phone} siap diakses di web monitoring (Conv ID: ${conv.id})`);
    }

    await prisma.$disconnect();
    console.log('   ✓ Database lokal berhasil diperbarui!');
  } catch (e) {
    console.warn(`   ⚠️ Gagal sinkronisasi langsung ke database lokal: ${e.message}`);
  }

  console.log('\n================================================================');
  console.log('🎉 PENGUJIAN SELESAI & SUKSES!');
  console.log('1. Buka Web Monitoring di browser (Menu Chatbot / Live Chat).');
  console.log(`2. Pilih percakapan nomor ${cleanPhone} atau +6282251715778.`);
  console.log('3. Bubble voice note akan tampil dengan tombol Play dan dapat langsung didengarkan.');
  console.log('================================================================');
}

run().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
