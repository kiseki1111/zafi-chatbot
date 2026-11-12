import { PrismaClient } from '@prisma/client';
import { evaluateLeadScore } from '../src/features/agent-cs/lead-intent.evaluator';
import * as fs from 'fs';
import * as path from 'path';

// Muat DATABASE_URL dari apps/backend/.env bila belum diset di environment.
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath) && !process.env.DATABASE_URL) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const prisma = new PrismaClient();

const ZAFI_EMAIL = 'zafi@properti.com';
const INSTANCE = 'zafi-cs';

interface Scenario {
  name: string;
  phone: string;
  status: string;
  messageCount: number;
  userMessage: string;
  leadNotes?: string;
  perumahan?: string;
  tipeUnit?: string;
  expected: 'HOT' | 'WARM' | 'COLD';
  messages?: Array<{ from: 'customer' | 'bot'; text: string }>;
}

const scenarios: Scenario[] = [
  {
    name: 'Hendra Wijaya',
    phone: '6281299900011',
    status: 'Survey',
    messageCount: 3,
    userMessage: 'besok minggu saya mau survey ke lokasi jam 10 pagi bisa?',
    leadNotes: 'Minta jadwal survey lokasi',
    perumahan: 'Griya Amanah 2',
    tipeUnit: 'Tipe 40',
    expected: 'HOT',
    messages: [
      {
        from: 'customer',
        text: 'besok minggu saya mau survey ke lokasi jam 10 pagi bisa?',
      },
      {
        from: 'bot',
        text: 'Halo Kak Hendra, tentu bisa. Tim kami bisa menjadwalkan survei Griya Amanah 2 hari Minggu jam 10. Boleh share lokasi Kakak?',
      },
      { from: 'customer', text: 'oke, share loc ya' },
      { from: 'customer', text: 'saya di daerah cibubur' },
    ],
  },
  {
    name: 'Dewi Lestari',
    phone: '6281299900022',
    status: 'Follow-Up',
    messageCount: 4,
    userMessage: 'untuk tipe 36 simulasi KPR dengan DP berapa ya per bulan?',
    leadNotes: 'Tanya simulasi KPR',
    perumahan: 'Zafi Residence',
    tipeUnit: 'Tipe 36',
    expected: 'HOT',
    messages: [
      {
        from: 'customer',
        text: 'untuk tipe 36 simulasi KPR dengan DP berapa ya per bulan?',
      },
      {
        from: 'bot',
        text: 'Halo Kak Dewi, untuk Tipe 36 harga 450 juta, DP 10% sekitar 45 juta. Cicilan KPR 15 tahun kurang lebih 3,3 juta per bulan.',
      },
      { from: 'customer', text: 'kalau DP 20% cicilannya berapa?' },
      {
        from: 'bot',
        text: 'Dengan DP 20%, cicilan sekitar 2,9 juta per bulan Kak.',
      },
      { from: 'customer', text: 'syarat SLIK OJK apa saja?' },
      { from: 'customer', text: 'saya karyawan swasta' },
    ],
  },
  {
    name: 'Agus Pratama',
    phone: '6281299900033',
    status: 'Booking',
    messageCount: 5,
    userMessage:
      'saya mau booking kavling A3, minta rekening PT untuk transfer DP',
    leadNotes: 'Minat booking kavling A3',
    perumahan: 'Kahyana Residence',
    tipeUnit: 'Tipe 45',
    expected: 'HOT',
    messages: [
      {
        from: 'customer',
        text: 'saya mau booking kavling A3, minta rekening PT untuk transfer DP',
      },
      {
        from: 'bot',
        text: 'Siap Kak Agus. Kavling A3 Tipe 45 masih tersedia. DP 20% sebesar 110 juta, rekening PT Kahyana Properti akan kami kirim.',
      },
      { from: 'customer', text: 'kirim rekening PT ya' },
      {
        from: 'bot',
        text: 'Baik, rekening BCA a/n PT Kahyana Properti sudah dikirim.',
      },
      { from: 'customer', text: 'nanti saya transfer DP hari ini' },
      { from: 'customer', text: 'tolong tahan unitnya dulu' },
    ],
  },
  {
    name: 'Rina Marlina',
    phone: '6281299900044',
    status: 'Follow-Up',
    messageCount: 10,
    userMessage: 'harga tipe 45 berapa ya kak?',
    leadNotes: 'Tanya harga tipe 45',
    perumahan: 'Griya Amanah 2',
    tipeUnit: 'Tipe 45',
    expected: 'HOT',
    messages: [
      { from: 'customer', text: 'harga tipe 45 berapa ya kak?' },
      {
        from: 'bot',
        text: 'Tipe 45 di Griya Amanah 2 harganya 550 juta Kak Rina.',
      },
      { from: 'customer', text: 'ada diskon kalau cash?' },
      { from: 'bot', text: 'Ada diskon cash 5% Kak.' },
      { from: 'customer', text: 'lokasinya dimana' },
      { from: 'customer', text: 'akses jalan lebar?' },
      { from: 'customer', text: 'ada unit ready?' },
      { from: 'customer', text: 'kapan bisa survey' },
      { from: 'customer', text: 'saya minat tipe 45' },
      { from: 'customer', text: 'nanti saya kabari lagi' },
    ],
  },
  {
    name: 'Siti Aminah',
    phone: '6281299900055',
    status: 'Follow-Up',
    messageCount: 5,
    userMessage: 'minta brosur dan pricelist terbaru kak',
    leadNotes: 'Minta brosur',
    perumahan: 'Zafi Residence',
    expected: 'WARM',
    messages: [
      { from: 'customer', text: 'minta brosur dan pricelist terbaru kak' },
      {
        from: 'bot',
        text: 'Siap Kak Siti, brosur Zafi Residence kami kirim sekarang.',
      },
      { from: 'customer', text: 'kirim ke WA ini ya' },
      { from: 'customer', text: 'ada promo bulan ini?' },
      { from: 'customer', text: 'tipe 36 sama 45 bedanya apa?' },
    ],
  },
  {
    name: 'Joko Susilo',
    phone: '6281299900066',
    status: 'Batal',
    messageCount: 3,
    userMessage: 'maaf kak kemahalan, saya tidak jadi ambil',
    leadNotes: 'Batal karena budget',
    expected: 'COLD',
    messages: [
      { from: 'customer', text: 'maaf kak kemahalan, saya tidak jadi ambil' },
      {
        from: 'bot',
        text: 'Baik Kak Joko, terima kasih sudah mempertimbangkan. Jika berubah pikiran kami siap membantu.',
      },
      { from: 'customer', text: 'budget saya tidak cukup' },
      { from: 'customer', text: 'makasih infonya' },
    ],
  },
  {
    name: 'Fajar Nugroho',
    phone: '6281299900077',
    status: 'Follow-Up',
    messageCount: 2,
    userMessage: 'tidak jadi masalah, boleh survey sabtu?',
    leadNotes: 'Negasi aman: tetap minta survey',
    expected: 'HOT',
    messages: [
      { from: 'customer', text: 'tidak jadi masalah, boleh survey sabtu?' },
      {
        from: 'bot',
        text: 'Tentu Kak Fajar, survei bisa hari Sabtu jam 9 pagi.',
      },
      { from: 'customer', text: 'oke sabtu jam 9 ya' },
    ],
  },
  {
    name: 'Lina Marlina',
    phone: '6281299900088',
    status: 'Follow-Up',
    messageCount: 2,
    userMessage: 'ga jadi deh kak',
    leadNotes: 'Slang batal',
    expected: 'COLD',
    messages: [
      { from: 'customer', text: 'ga jadi deh kak' },
      { from: 'bot', text: 'Baik Kak Lina, terima kasih infonya.' },
      { from: 'customer', text: 'makasih' },
    ],
  },
];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed dummy Hot Lead hanya untuk environment development.');
  }
  const user = await prisma.user.findUnique({
    where: { email: ZAFI_EMAIL },
    include: { tenant: true },
  });
  if (!user?.tenantId) {
    throw new Error(`Akun ${ZAFI_EMAIL} tidak ditemukan / tidak punya tenant.`);
  }
  const tenantId = user.tenantId;

  const instance = await prisma.whatsappInstance.findUnique({
    where: { instanceName: INSTANCE },
  });
  if (!instance) {
    throw new Error(`Instance WhatsApp "${INSTANCE}" tidak ditemukan.`);
  }

  console.log(`Tenant Zafi: ${tenantId}`);
  console.log(`Instance    : ${INSTANCE}\n`);

  // Bersihkan dummy sebelumnya agar script bisa dijalankan berulang.
  await prisma.contact.deleteMany({
    where: { tenantId, phone: { in: scenarios.map((s) => s.phone) } },
  });

  const rows: string[] = [];
  let index = 0;

  for (const s of scenarios) {
    const result = evaluateLeadScore({
      status: s.status,
      messageCount: s.messageCount,
      userMessage: s.userMessage,
    });

    const now = Date.now() - index * 5 * 60 * 1000;
    const isHot = result.score === 'HOT';

    const metadata: Record<string, any> = {
      ...(s.perumahan ? { perumahan: s.perumahan } : {}),
      ...(s.tipeUnit ? { tipeUnit: s.tipeUnit } : {}),
      leadScore: result.score,
      leadScoreCode: result.code,
      hotTriggerReason: result.reason,
      ...(result.matchedKeyword
        ? { hotMatchedKeyword: result.matchedKeyword }
        : {}),
      messageCount: s.messageCount,
      leadScoreUpdatedAt: new Date(now).toISOString(),
      ...(isHot
        ? {
            hotEpisodeStartedAt: new Date(now).toISOString(),
            hotAcknowledged: false,
          }
        : {
            hotAcknowledged: true,
          }),
      statusLogs: [
        {
          status: s.status,
          notes: s.leadNotes || s.userMessage,
          timestamp: new Date(now).toISOString(),
        },
      ],
    };

    const contact = await prisma.contact.create({
      data: {
        tenantId,
        name: s.name,
        phone: s.phone,
        status: s.status,
        notes: s.leadNotes,
        source: 'WHATSAPP',
        metadata,
        createdAt: new Date(now - 60 * 60 * 1000),
      },
    });

    // Buat conversation + riwayat pesan dummy sesuai messageCount.
    const conversation = await prisma.conversation.create({
      data: {
        contactId: contact.id,
        instanceName: INSTANCE,
        status: 'OPEN',
        lastMessageAt: new Date(now),
      },
    });

    // Isi percakapan realistis. messageCount = jumlah pesan CUSTOMER unik.
    const totalCustomer = Math.min(s.messageCount, 12);
    const script =
      s.messages && s.messages.length > 0
        ? s.messages
        : [{ from: 'customer' as const, text: s.userMessage }];
    const baseTime =
      now - Math.max(script.length, totalCustomer * 2) * 60 * 1000;
    let seq = 0;
    let customerAdded = 0;

    const pushMessage = async (from: 'customer' | 'bot', text: string) => {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: from,
          content: text,
          createdAt: new Date(baseTime + seq * 60 * 1000),
        },
      });
      seq += 1;
      if (from === 'customer') customerAdded += 1;
    };

    for (const m of script) {
      await pushMessage(m.from, m.text);
    }
    while (customerAdded < totalCustomer) {
      await pushMessage('bot', 'Baik Kak, kami bantu jelaskan ya.');
      await pushMessage('customer', `Pesan pelanggan #${customerAdded + 1}`);
    }

    if (isHot) {
      await prisma.auditLog.create({
        data: {
          action: 'HOT_LEAD_DETECTED',
          module: 'CRM',
          endpoint: 'SEED_DUMMY',
          status: 'SUCCESS',
          details: {
            contactId: contact.id,
            phone: s.phone,
            name: s.name,
            reason: result.reason,
            code: result.code,
            triggerType: result.triggerType,
            matchedKeyword: result.matchedKeyword || null,
            messageCount: s.messageCount,
          },
        },
      });
    }

    const flag =
      result.score === s.expected ? 'OK' : `MISMATCH (expected ${s.expected})`;
    rows.push(
      `${s.name.padEnd(16)} | ${s.phone} | ${String(s.messageCount).padStart(2)} pesan | ${result.score.padEnd(4)} | ${result.triggerType.padEnd(13)} | ${result.reason} | ${flag}`,
    );
    index++;
  }

  console.log('Hasil evaluasi trigger:');
  console.log(
    'Nama             | Telepon        | Pesan    | Tier | Trigger       | Alasan | Cek',
  );
  console.log('-'.repeat(120));
  rows.forEach((r) => console.log(r));
  console.log(
    `\nSelesai. ${scenarios.filter((s) => s.expected === 'HOT').length} HOT lead (unread) dibuat untuk tenant Zafi.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
