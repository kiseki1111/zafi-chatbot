import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed process for UMKM Assistant & Tier Accounts...');

  const defaultPassword = await bcrypt.hash('Admin@123', 10);

  // 1. Seed Superadmin
  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@umkm.id' },
    update: { role: 'superadmin' },
    create: {
      email: 'superadmin@umkm.id',
      name: 'Super Admin Master',
      password: defaultPassword,
      role: 'superadmin',
    },
  });
  console.log('✓ Superadmin siap:', superadmin.email);

  // 2. Daftar Akun Dummy per Tier & Status Trial
  const tierAccounts = [
    {
      plan: 'lite',
      companyName: 'PT Maju UMKM (Lite Tier)',
      email: 'lite@perusahaan.com',
      passwordPlain: 'Lite@123',
      isTrial: false,
      maxMau: 300,
      maxAiResponses: 1000,
    },
    {
      plan: 'bronze',
      companyName: 'CV Tumbuh Bersama (Bronze Tier)',
      email: 'bronze@perusahaan.com',
      passwordPlain: 'Bronze@123',
      isTrial: false,
      maxMau: 1000,
      maxAiResponses: 4000,
    },
    {
      plan: 'silver',
      companyName: 'PT Properti Prima (Silver Tier)',
      email: 'silver@perusahaan.com',
      passwordPlain: 'Silver@123',
      isTrial: false,
      maxMau: 2500,
      maxAiResponses: 10000,
    },
    {
      plan: 'gold',
      companyName: 'PT Mega Korporasi (Gold Tier)',
      email: 'gold@perusahaan.com',
      passwordPlain: 'Gold@123',
      isTrial: false,
      maxMau: 6000,
      maxAiResponses: 24000,
    },
    {
      plan: 'developer',
      companyName: 'Zafi Internal Platform (Developer Root)',
      email: 'developer@perusahaan.com',
      passwordPlain: 'Developer@123',
      isTrial: false,
      maxMau: 999999999,
      maxAiResponses: 999999999,
    },
    {
      plan: 'lite',
      companyName: 'PT Pelanggan Baru (Trial 14 Hari Aktif)',
      email: 'trial.active@perusahaan.com',
      passwordPlain: 'Trial@123',
      isTrial: true,
      trialStartedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      trialExpiresAt: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(), // 11 hari lagi
      maxMau: 300,
      maxAiResponses: 1000,
    },
    {
      plan: 'lite',
      companyName: 'CV Uji Coba Lewat (Trial Expired)',
      email: 'trial.expired@perusahaan.com',
      passwordPlain: 'Trial@123',
      isTrial: true,
      trialStartedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
      trialExpiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Lewat 2 hari
      maxMau: 300,
      maxAiResponses: 1000,
    },
  ];

  for (const acc of tierAccounts) {
    const pwHash = await bcrypt.hash(acc.passwordPlain, 10);

    // Cari atau buat tenant
    let tenant = await prisma.tenant.findFirst({
      where: { name: acc.companyName },
    });

    const metadata = {
      plan: acc.plan,
      planName: acc.plan.toUpperCase(),
      isTrial: acc.isTrial,
      trialStartedAt: acc.trialStartedAt || null,
      trialExpiresAt: acc.trialExpiresAt || null,
      maxMau: acc.maxMau,
      maxAiResponses: acc.maxAiResponses,
      enabledMenus: ['overview', 'crm', 'chatbot', 'knowledge', 'availability', 'followup', 'settings'],
    };

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: acc.companyName,
          category: 'properti',
          agentName: 'Luna',
          metadata,
        },
      });
    } else {
      tenant = await prisma.tenant.update({
        where: { id: tenant.id },
        data: { metadata },
      });
    }

    // Buat akun user
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        password: pwHash,
        tenantId: tenant.id,
        role: 'manager',
      },
      create: {
        name: `Manager ${acc.plan.toUpperCase()}`,
        email: acc.email,
        password: pwHash,
        role: 'manager',
        tenantId: tenant.id,
      },
    });

    // SECURITY: jangan log password plaintext
    console.log(`✓ Akun ${acc.plan.toUpperCase()} siap: ${user.email}`);
  }

  console.log('Seed dummy accounts for all tiers & trial completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
