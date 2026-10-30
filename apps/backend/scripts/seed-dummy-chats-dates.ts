import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== SEEDING DUMMY CHATS DENGAN BERBAGAI FORMAT TANGGAL UNTUK ZAFI PROPERTI ===\n');

  const user = await prisma.user.findUnique({
    where: { email: 'zafi@properti.com' },
    include: { tenant: { include: { whatsappInstances: true } } },
  });

  if (!user || !user.tenant) {
    throw new Error('User zafi@properti.com atau tenant tidak ditemukan!');
  }

  const tenant = user.tenant;
  console.log(`Tenant: ${tenant.name} (${tenant.id})`);

  // Pastikan instance ada
  const instanceNames = tenant.whatsappInstances.map((i) => i.instanceName);
  if (instanceNames.length === 0) {
    await prisma.whatsappInstance.create({
      data: { instanceName: 'Zafi-CS', tenantId: tenant.id, status: 'WORKING' },
    });
    instanceNames.push('Zafi-CS');
  }

  console.log('Instances:', instanceNames);

  const now = new Date();
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  // Helper tanggal masa lalu
  function makeDate(daysAgo: number, hours: number, minutes: number): Date {
    const d = new Date(now);
    d.setDate(now.getDate() - daysAgo);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  // Tanggal spesifik seperti screenshot Image 2 (21/10/2026)
  const date21Oct = new Date(2026, 9, 21); // Month 9 is Oct (0-indexed)
  function makeFixedDate(year: number, month1to12: number, day: number, h: number, m: number): Date {
    return new Date(year, month1to12 - 1, day, h, m, 0, 0);
  }

  const dummyScenarios = [
    {
      contactName: 'Ardito Lead',
      phone: '6281649433281',
      stage: 'lead',
      unreadCount: 1,
      messages: [
        // Hari 1: 21/10/2026 (9 hari lalu - seperti di screenshot 2 WhatsApp)
        {
          senderType: 'customer',
          content: 'Halo Zafi Properti, saya tertarik dengan unit kaveling di Cluster Sakura.',
          createdAt: makeFixedDate(2026, 10, 21, 10, 15),
        },
        {
          senderType: 'bot',
          content: 'Halo Mas Ardito! Selamat datang di Zafi Properti. Cluster Sakura saat ini tersedia tipe 36 dan 45. Ada yang ingin ditanyakan spesifik?',
          createdAt: makeFixedDate(2026, 10, 21, 10, 16),
        },
        {
          senderType: 'customer',
          content: 'Boleh kirimkan pricelist dan simulasi KPR untuk tipe 45/90?',
          createdAt: makeFixedDate(2026, 10, 21, 10, 18),
        },
        {
          senderType: 'bot',
          content: 'Tentu Mas Ardito! Pricelist tipe 45/90 mulai Rp 650 Juta dengan promo Subsidi DP 0% & Free BPHTB. Cicilan mulai 3 jutaan/bulan.',
          createdAt: makeFixedDate(2026, 10, 21, 10, 19),
        },
        // Hari 2: Kemarin (Yesterday)
        {
          senderType: 'customer',
          content: 'Siang min, kemarin saya sudah pelajari pricelistnya. Apakah akhir pekan ini bisa survey ke lokasi?',
          createdAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 14, 20),
        },
        {
          senderType: 'agent',
          content: 'Bisa banget Mas Ardito! Tim sales kami siap mendampingi di lokasi hari Sabtu atau Minggu jam 10 pagi.',
          createdAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 14, 22),
        },
        {
          senderType: 'customer',
          content: 'Oke saya jadwalkan hari Sabtu jam 10 ya min.',
          createdAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 14, 25),
        },
        {
          senderType: 'agent',
          content: 'Siap Mas Ardito, sudah kami catat jadwal survey kaveling Blok A-05 hari Sabtu jam 10.00 WIB.',
          createdAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 14, 26),
        },
        // Hari 3: Hari ini (Today)
        {
          senderType: 'customer',
          content: 'Pagi min, boleh tolong shareloc kantor pemasaran Zafi Properti?',
          createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30),
        },
        {
          senderType: 'agent',
          content: 'Pagi Mas! Lokasi kami di Jl. Raya Grand Harmoni No. 8, Jawa Barat. Petugas kami sudah standby menunggu Mas Ardito.',
          createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 32),
        },
        {
          senderType: 'customer',
          content: 'Oke terima kasih min, saya otw ke lokasi sekarang.',
          createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 15),
        },
      ],
    },
    {
      contactName: 'Dicky Ivan Setiawan',
      phone: '6281287790226',
      stage: 'prospect',
      unreadCount: 0,
      messages: [
        // Sesuai screenshot 2 WhatsApp
        {
          senderType: 'customer',
          content: 'Pesan2 notifnya blm ada',
          createdAt: makeFixedDate(2026, 10, 21, 21, 3),
        },
        {
          senderType: 'agent',
          content: 'okeeee banggg',
          createdAt: makeFixedDate(2026, 10, 21, 21, 6),
        },
        {
          senderType: 'agent',
          content: 'Notifikasi sistem follow-up otomatis dan rekap laporan lead sudah aktif ya bang.',
          createdAt: makeFixedDate(2026, 10, 21, 21, 8),
        },
        {
          senderType: 'customer',
          content: 'Mantap, makasih banyak infonya bang!',
          createdAt: makeFixedDate(2026, 10, 21, 21, 10),
        },
      ],
    },
    {
      contactName: 'Budi Santoso (KPR BTN)',
      phone: '6281311223344',
      stage: 'negotiation',
      unreadCount: 2,
      messages: [
        // Tanggal 15/10/2026
        {
          senderType: 'customer',
          content: 'Selamat pagi, mau tanya unit hook di Blok B-12 luas tanah berapa ya?',
          createdAt: makeFixedDate(2026, 10, 15, 8, 45),
        },
        {
          senderType: 'bot',
          content: 'Selamat pagi Pak Budi! Blok B-12 adalah tipe 45 dengan kelebihan tanah hook total luas 120m².',
          createdAt: makeFixedDate(2026, 10, 15, 8, 46),
        },
        // Kemarin (Yesterday)
        {
          senderType: 'customer',
          content: 'Min, berkas slip gaji dan rekening koran 3 bulan terakhir sudah saya lengkapi.',
          createdAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 16, 10),
        },
        {
          senderType: 'agent',
          content: 'Terima kasih Pak Budi. Berkas sudah kami verifikasi awal dan siap disubmit ke Bank BTN cabang terdekat.',
          createdAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 16, 15),
        },
        {
          senderType: 'customer',
          content: 'Kira-kira proses persetujuan SP3K nya butuh berapa lama ya mas?',
          createdAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 16, 20),
        },
      ],
    },
    {
      contactName: 'Siti Rahmawati',
      phone: '6281988776655',
      stage: 'customer',
      unreadCount: 0,
      messages: [
        // Tanggal 05/10/2026
        {
          senderType: 'customer',
          content: 'Halo Zafi Properti, booking fee perumahan ini bisa via transfer BCA?',
          createdAt: makeFixedDate(2026, 10, 5, 11, 0),
        },
        {
          senderType: 'bot',
          content: 'Bisa Ibu Siti! Pembayaran booking fee resmi hanya melalui Rekening BCA PT Zafi Properti Land.',
          createdAt: makeFixedDate(2026, 10, 5, 11, 2),
        },
        // Hari ini (Today)
        {
          senderType: 'customer',
          content: 'Selamat siang min, saya sudah transfer pelunasan DP tahap 1 ya.',
          createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 40),
        },
        {
          senderType: 'agent',
          content: 'Alhamdulillah sudah kami terima kwitansi resminya Bu Siti! Kwitansi cetak akan kami kirimkan via kurir atau bisa diambil saat tanda tangan PPJB.',
          createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 45),
        },
      ],
    },
    {
      contactName: 'Hendro Wijaya',
      phone: '6285712349876',
      stage: 'lead',
      unreadCount: 0,
      messages: [
        // Kemarin (Yesterday)
        {
          senderType: 'customer',
          content: 'Malam, tipe 36 ready stock atau indent?',
          createdAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 20, 15),
        },
        {
          senderType: 'bot',
          content: 'Malam Pak Hendro! Tipe 36/72 di Zafi Residence ready stock 2 unit dan siap serah terima kunci bulan depan.',
          createdAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 20, 16),
        },
        {
          senderType: 'customer',
          content: 'Bagus deh kalau ready stock. Besok saya kabari lagi.',
          createdAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 20, 18),
        },
      ],
    },
  ];

  // Seed ke instance yang aktif untuk tenant ini
  for (const targetInstance of instanceNames) {
    console.log(`\n--- Memproses untuk WhatsApp Instance: ${targetInstance} ---`);

    for (const scenario of dummyScenarios) {
      // 1. Upsert contact
      const contact = await prisma.contact.upsert({
        where: { id: `dummy-${tenant.id.slice(0, 8)}-${scenario.phone}` },
        update: {
          name: scenario.contactName,
          phone: scenario.phone,
          status: scenario.stage.toUpperCase(),
          tenantId: tenant.id,
          metadata: {
            profileName: scenario.contactName,
            pushName: scenario.contactName,
          },
        },
        create: {
          id: `dummy-${tenant.id.slice(0, 8)}-${scenario.phone}`,
          tenantId: tenant.id,
          name: scenario.contactName,
          phone: scenario.phone,
          status: scenario.stage.toUpperCase(),
          source: 'WHATSAPP',
          metadata: {
            profileName: scenario.contactName,
            pushName: scenario.contactName,
          },
        },
      });

      // 2. Upsert conversation
      const lastMsgDate = scenario.messages[scenario.messages.length - 1].createdAt;
      const conv = await prisma.conversation.upsert({
        where: {
          instanceName_contactId: {
            instanceName: targetInstance,
            contactId: contact.id,
          },
        },
        update: {
          lastMessageAt: lastMsgDate,
          unreadCount: scenario.unreadCount,
          status: 'OPEN',
          mode: 'bot',
        },
        create: {
          instanceName: targetInstance,
          contactId: contact.id,
          lastMessageAt: lastMsgDate,
          unreadCount: scenario.unreadCount,
          status: 'OPEN',
          mode: 'bot',
        },
      });

      // 3. Hapus pesan dummy lama di percakapan ini (agar bersih tidak duplikat)
      await prisma.message.deleteMany({
        where: { conversationId: conv.id },
      });

      // 4. Masukkan pesan dengan timestamp masing-masing
      for (let i = 0; i < scenario.messages.length; i++) {
        const m = scenario.messages[i];
        await prisma.message.create({
          data: {
            conversationId: conv.id,
            senderType: m.senderType,
            messageType: 'TEXT',
            content: m.content,
            status: 'READ',
            createdAt: m.createdAt,
            metadata: {
              sender: { pushname: scenario.contactName },
              _data: { notifyName: scenario.contactName },
            },
            senderId: m.senderType === 'agent' ? user.id : null,
          },
        });
      }

      console.log(`  ✓ Kontak: ${scenario.contactName} (${scenario.phone}) -> ${scenario.messages.length} pesan`);
    }
  }

  // Juga perbarui percakapan yang ada dari screenshot (Pelanggan +6281649433281) jika ada dengan ID lain
  const oldArditos = await prisma.conversation.findMany({
    where: {
      contact: { phone: { contains: '6281649433281' } },
    },
    include: { contact: true },
  });

  for (const c of oldArditos) {
    if (!c.id.startsWith('dummy-')) {
      await prisma.contact.update({
        where: { id: c.contactId },
        data: { name: 'Ardito Lead' },
      });
    }
  }

  console.log('\n==================================================');
  console.log('SEEDING DUMMY CHATS BERHASIL!');
  console.log('Sekarang buka halaman Live Chat / Monitoring pada akun zafi@properti.com');
  console.log('Anda akan melihat:');
  console.log(' - Badge "21/10/2026" (seperti di WhatsApp Image 2)');
  console.log(' - Badge "Kemarin"');
  console.log(' - Badge "Hari ini"');
  console.log(' - Format jam 24 jam (HH:mm) tanpa AM/PM');
  console.log('==================================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
