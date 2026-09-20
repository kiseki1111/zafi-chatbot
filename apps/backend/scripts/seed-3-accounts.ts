import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('=== SEEDING 3 AKUN UTAMA SISTEM ===\n');

  // Password default untuk testing
  const defaultPassword = 'Password@123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // -------------------------------------------------------------
  // 1. Akun Superadmin (Master Platform - Kelola Klien & Fitur Khusus)
  // -------------------------------------------------------------
  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@propertiku.id' },
    update: {
      name: 'Super Admin Master',
      role: 'superadmin',
      password: hashedPassword,
    },
    create: {
      name: 'Super Admin Master',
      email: 'superadmin@propertiku.id',
      password: hashedPassword,
      role: 'superadmin',
    },
  });
  console.log('✓ 1. Akun Superadmin siap:');
  console.log(`     Email: superadmin@propertiku.id | Password: ${defaultPassword} | Role: superadmin\n`);

  // -------------------------------------------------------------
  // 2. Akun Zafi (Developer Properti / Siteplan Plansite)
  // -------------------------------------------------------------
  let zafiTenant = await prisma.tenant.findFirst({
    where: { name: 'Zafi Properti Land' },
  });
  if (!zafiTenant) {
    zafiTenant = await prisma.tenant.create({
      data: {
        name: 'Zafi Properti Land',
        category: 'properti',
        phone: '6285168768994',
        address: 'Jl. Raya Grand Harmoni No. 8, Jawa Barat',
        agentName: 'Zafi AI Properti',
        metadata: {
          enabledMenus: ['overview', 'chatbot', 'crm', 'availability', 'knowledge', 'followup', 'settings'],
          businessType: 'properti',
          featuresNote: 'Menggunakan visualisasi siteplan kaveling unit rumah',
        },
      },
    });
  } else {
    await prisma.tenant.update({
      where: { id: zafiTenant.id },
      data: {
        category: 'properti',
        metadata: {
          enabledMenus: ['overview', 'chatbot', 'crm', 'availability', 'knowledge', 'followup', 'settings'],
          businessType: 'properti',
          featuresNote: 'Menggunakan visualisasi siteplan kaveling unit rumah',
        },
      },
    });
  }

  const zafiUser = await prisma.user.upsert({
    where: { email: 'zafi@properti.com' },
    update: {
      name: 'Zafi Property Manager',
      role: 'manager',
      password: hashedPassword,
      tenantId: zafiTenant.id,
    },
    create: {
      name: 'Zafi Property Manager',
      email: 'zafi@properti.com',
      password: hashedPassword,
      role: 'manager',
      tenantId: zafiTenant.id,
    },
  });
  // Pastikan sesi WhatsApp Zafi terhubung ke tenant Zafi
  await prisma.whatsappInstance.upsert({
    where: { instanceName: 'zafi' },
    update: { tenantId: zafiTenant.id },
    create: { instanceName: 'zafi', tenantId: zafiTenant.id, status: 'STOPPED' },
  });
  await prisma.whatsappInstance.upsert({
    where: { instanceName: 'zafi-cs' },
    update: { tenantId: zafiTenant.id },
    create: { instanceName: 'zafi-cs', tenantId: zafiTenant.id, status: 'STOPPED' },
  });
  await prisma.whatsappInstance.upsert({
    where: { instanceName: 'Zafi-CS' },
    update: { tenantId: zafiTenant.id },
    create: { instanceName: 'Zafi-CS', tenantId: zafiTenant.id, status: 'STOPPED' },
  });

  console.log('✓ 2. Akun Zafi (Properti & Siteplan) siap:');
  console.log(`     Email: zafi@properti.com | Password: ${defaultPassword} | Role: manager`);
  console.log(`     Tenant: ${zafiTenant.name} (Menus: Plansite, CRM, Bot WA, Knowledge, Settings)\n`);

  // -------------------------------------------------------------
  // 3. Akun Nusantara Bus (PO Bus & Reservasi Denah 17 Seat)
  // -------------------------------------------------------------
  let busTenant = await prisma.tenant.findFirst({
    where: { name: 'PO Nusantara Bus Transport' },
  });
  if (!busTenant) {
    busTenant = await prisma.tenant.create({
      data: {
        name: 'PO Nusantara Bus Transport',
        category: 'transport',
        phone: '6281234567890',
        address: 'Terminal Bus Terpadu Jakarta Timur',
        agentName: 'Nusantara Bus CS',
        metadata: {
          enabledMenus: ['overview', 'chatbot', 'crm', 'bus_layout', 'settings'],
          businessType: 'transport',
          featuresNote: 'Denah kursi 17 seats microbus eksekutif & reservasi tiket',
        },
      },
    });
  } else {
    await prisma.tenant.update({
      where: { id: busTenant.id },
      data: {
        category: 'transport',
        metadata: {
          enabledMenus: ['overview', 'chatbot', 'crm', 'bus_layout', 'settings'],
          businessType: 'transport',
          featuresNote: 'Denah kursi 17 seats microbus eksekutif & reservasi tiket',
        },
      },
    });
  }

  const busUser = await prisma.user.upsert({
    where: { email: 'manager@nusantarabus.com' },
    update: {
      name: 'Manager Nusantara Bus',
      role: 'manager',
      password: hashedPassword,
      tenantId: busTenant.id,
    },
    create: {
      name: 'Manager Nusantara Bus',
      email: 'manager@nusantarabus.com',
      password: hashedPassword,
      role: 'manager',
      tenantId: busTenant.id,
    },
  });
  // Pastikan sesi WhatsApp Bus terhubung ke tenant Bus
  await prisma.whatsappInstance.upsert({
    where: { instanceName: 'nusantara-bus' },
    update: { tenantId: busTenant.id },
    create: { instanceName: 'nusantara-bus', tenantId: busTenant.id, status: 'STOPPED' },
  });

  console.log('✓ 3. Akun Nusantara Bus (Armada & Denah Kursi) siap:');
  console.log(`     Email: manager@nusantarabus.com | Password: ${defaultPassword} | Role: manager`);
  console.log(`     Tenant: ${busTenant.name} (Menus: Denah Kursi Bus, CRM, Bot WA, Settings)\n`);

  console.log('==================================================');
  console.log('SEEDING SELESAI!');
  console.log('==================================================');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
