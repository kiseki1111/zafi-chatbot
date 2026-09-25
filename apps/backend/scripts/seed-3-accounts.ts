import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('=== SEEDING SEMUA AKUN UTAMA SISTEM ===\n');

  const defaultPassword = 'Password@123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // 1. Akun Superadmin
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
  console.log('✓ 1. Akun Superadmin:');
  console.log(`     Email: superadmin@propertiku.id | Password: ${defaultPassword} | Role: superadmin\n`);

  // 2. Akun Zafi Property
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
          featuresNote: 'Visualisasi siteplan kaveling unit rumah',
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

  await prisma.whatsappInstance.upsert({
    where: { instanceName: 'zafi-cs' },
    update: { tenantId: zafiTenant.id },
    create: { instanceName: 'zafi-cs', tenantId: zafiTenant.id, status: 'STOPPED' },
  });

  console.log('✓ 2. Akun Zafi Property:');
  console.log(`     Email: zafi@properti.com | Password: ${defaultPassword} | Tenant ID: ${zafiTenant.id}\n`);

  // 3. Akun Nusantara Bus
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

  await prisma.whatsappInstance.upsert({
    where: { instanceName: 'nusantara-bus' },
    update: { tenantId: busTenant.id },
    create: { instanceName: 'nusantara-bus', tenantId: busTenant.id, status: 'STOPPED' },
  });

  console.log('✓ 3. Akun Nusantara Bus:');
  console.log(`     Email: manager@nusantarabus.com | Password: ${defaultPassword} | Tenant ID: ${busTenant.id}\n`);

  // 4. Akun Rindang Property
  let rindangTenant = await prisma.tenant.findFirst({
    where: { name: 'Rindang Property' },
  });
  if (!rindangTenant) {
    rindangTenant = await prisma.tenant.create({
      data: {
        name: 'Rindang Property',
        category: 'properti',
        phone: '6289876543210',
        address: 'Jl. Rindang Asri No. 12, Jawa Barat',
        agentName: 'Rindang AI Properti',
        metadata: {
          enabledMenus: ['overview', 'chatbot', 'crm', 'availability', 'knowledge', 'followup', 'settings'],
          businessType: 'properti',
          featuresNote: 'Visualisasi siteplan perumahan Rindang',
        },
      },
    });
  }

  const rindangUser = await prisma.user.upsert({
    where: { email: 'rindang@gmail.com' },
    update: {
      name: 'Rindang Property Manager',
      role: 'manager',
      password: hashedPassword,
      tenantId: rindangTenant.id,
    },
    create: {
      name: 'Rindang Property Manager',
      email: 'rindang@gmail.com',
      password: hashedPassword,
      role: 'manager',
      tenantId: rindangTenant.id,
    },
  });

  await prisma.whatsappInstance.upsert({
    where: { instanceName: 'rindang-cs' },
    update: { tenantId: rindangTenant.id },
    create: { instanceName: 'rindang-cs', tenantId: rindangTenant.id, status: 'STOPPED' },
  });

  console.log('✓ 4. Akun Rindang Property:');
  console.log(`     Email: rindang@gmail.com | Password: ${defaultPassword} | Tenant ID: ${rindangTenant.id}\n`);

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
