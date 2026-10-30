import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const PRICING_TIERS_CONFIG = [
  {
    key: 'lite',
    name: 'Lite - UMKM',
    price: 249000,
    priceLabel: 'Rp 249.000/bln',
    yearlyPrice: 209000,
    yearlyPriceLabel: 'Rp 209.000/bln',
    yearlySavings: '16.1%',
    maxAiResponses: 1000,
    maxMau: 300,
    whatsappNumbers: 1,
    maxProjects: 1,
    maxUsers: 1,
    setupFee: 0,
    setupFeeLabel: 'Rp 0',
    yearlySetupDiscount: 'Tidak ada setup',
    trialDays: '14 hari',
    support: 'Panduan & email',
    onboarding: 'Self-service',
    avgAiResponsePerMau: '3.3 respons/kontak',
    desc: 'Cocok untuk UMKM pemula dengan 1 nomor WhatsApp & 1 proyek',
  },
  {
    key: 'bronze',
    name: 'Bronze - Starter',
    price: 499000,
    priceLabel: 'Rp 499.000/bln',
    yearlyPrice: 429000,
    yearlyPriceLabel: 'Rp 429.000/bln',
    yearlySavings: '14.0%',
    maxAiResponses: 4000,
    maxMau: 1000,
    whatsappNumbers: 1,
    maxProjects: 1,
    maxUsers: 3,
    setupFee: 500000,
    setupFeeLabel: 'Rp 500.000',
    yearlySetupDiscount: 'Gratis',
    trialDays: '14 hari',
    support: 'WhatsApp, 2x24 jam',
    onboarding: 'Self-service + video',
    avgAiResponsePerMau: '4.0 respons/kontak',
    desc: 'Starter pack tim berkembang dengan hingga 3 pengguna & support WhatsApp',
  },
  {
    key: 'silver',
    name: 'Silver - Pro',
    price: 999000,
    priceLabel: 'Rp 999.000/bln',
    yearlyPrice: 849000,
    yearlyPriceLabel: 'Rp 849.000/bln',
    yearlySavings: '15.0%',
    maxAiResponses: 10000,
    maxMau: 2500,
    whatsappNumbers: 2,
    maxProjects: 3,
    maxUsers: 6,
    setupFee: 500000,
    setupFeeLabel: 'Rp 500.000',
    yearlySetupDiscount: 'Gratis',
    trialDays: '14 hari',
    support: 'WhatsApp, 1x24 jam',
    onboarding: '1x sesi online',
    avgAiResponsePerMau: '4.0 respons/kontak',
    desc: 'Paling populer untuk bisnis multi-proyek (3 siteplan), 2 nomor WA & 6 pengguna',
  },
  {
    key: 'gold',
    name: 'Gold - Business',
    price: 1999000,
    priceLabel: 'Rp 1.999.000/bln',
    yearlyPrice: 1699000,
    yearlyPriceLabel: 'Rp 1.699.000/bln',
    yearlySavings: '15%',
    maxAiResponses: 24000,
    maxMau: 6000,
    whatsappNumbers: 4,
    maxProjects: 8,
    maxUsers: 12,
    setupFee: 0,
    setupFeeLabel: 'Rp 0',
    yearlySetupDiscount: 'Gratis',
    trialDays: '14 hari',
    support: 'Dedicated PIC + SLA 4 jam',
    onboarding: '3x sesi online',
    avgAiResponsePerMau: '4 respons/kontak',
    desc: 'Skala korporat & bisnis besar dengan 4 nomor WA, 8 proyek & Dedicated PIC SLA 4 jam',
  },
  {
    key: 'enterprise',
    name: 'Enterprise - Corporate',
    price: 0,
    priceLabel: 'Kustom',
    yearlyPrice: 0,
    yearlyPriceLabel: 'Kustom',
    yearlySavings: 'Sesuai Kontrak',
    maxAiResponses: 100000,
    maxMau: 25000,
    whatsappNumbers: 10,
    maxProjects: 25,
    maxUsers: 50,
    setupFee: 0,
    setupFeeLabel: 'Custom',
    yearlySetupDiscount: 'Custom',
    trialDays: 'POC 30 hari',
    support: 'Dedicated + SLA 2 jam',
    onboarding: 'Full project',
    avgAiResponsePerMau: '5.0 respons/kontak',
    desc: 'Solusi korporat enterprise dengan POC 30 hari & Dedicated SLA 2 jam',
  },
  {
    key: 'developer',
    name: 'Developer Mode (Internal)',
    price: 0,
    priceLabel: 'Unlimited / Internal',
    yearlyPrice: 0,
    yearlyPriceLabel: 'Unlimited',
    yearlySavings: '100%',
    maxAiResponses: 999999999,
    maxMau: 999999999,
    whatsappNumbers: 999,
    maxProjects: 999,
    maxUsers: 999,
    setupFee: 0,
    setupFeeLabel: 'Rp 0',
    yearlySetupDiscount: 'Gratis',
    trialDays: 'Selamanya',
    support: 'Internal Root Access',
    onboarding: 'All Features Unlocked',
    avgAiResponsePerMau: 'Unlimited',
    desc: 'Mode khusus perusahaan pemilik SaaS: seluruh fitur & kuota tanpa batas',
  },
  {
    key: 'custom',
    name: 'Kustom - Fleksibel',
    price: 0,
    priceLabel: 'Kustom',
    yearlyPrice: 0,
    yearlyPriceLabel: 'Kustom',
    yearlySavings: '-',
    maxAiResponses: 10000,
    maxMau: 1000,
    whatsappNumbers: 2,
    maxProjects: 3,
    maxUsers: 5,
    setupFee: 0,
    setupFeeLabel: 'Kustom',
    yearlySetupDiscount: 'Kustom',
    trialDays: '14 hari',
    support: 'Dedicated Support',
    onboarding: 'Kustom',
    avgAiResponsePerMau: 'Kustom',
    desc: 'Kustomisasi batas MAU, AI respons, nomor WhatsApp & pengguna sesuai kebutuhan',
  },
];

async function main() {
  console.log('--- 1. Resetting all existing tenant packages to null ---');
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, metadata: true },
  });

  for (const t of tenants) {
    const meta = (t.metadata as Record<string, any>) || {};
    const updatedMeta = {
      ...meta,
      plan: null,
      planName: null,
      planPrice: 0,
      maxMau: 0,
      maxAiResponses: 0,
    };

    await prisma.tenant.update({
      where: { id: t.id },
      data: { metadata: updatedMeta },
    });
    console.log(`✓ Tenant "${t.name}" (${t.id}) -> plan set to null`);
  }

  console.log('\n--- 2. Upserting platform pricing config (Lite, Bronze, Silver, Gold, Custom) ---');
  await prisma.platformConfig.upsert({
    where: { key: 'pricing' },
    update: { value: PRICING_TIERS_CONFIG },
    create: { key: 'pricing', value: PRICING_TIERS_CONFIG },
  });
  console.log('✓ platformConfig "pricing" successfully saved to database');

  console.log('\n=== DONE ===');
}

main()
  .catch((e) => {
    console.error('Error executing script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
