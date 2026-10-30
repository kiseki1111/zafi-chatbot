import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { DataAgentService } from '../../knowledge-ingest/data-agent.service';

export interface PlanTierConfig {
  key: string;
  name: string;
  price: number;
  priceLabel: string;
  yearlyPrice: number;
  yearlyPriceLabel: string;
  yearlySavings: string;
  maxAiResponses: number;
  maxMau: number;
  whatsappNumbers: number;
  maxProjects: number;
  maxUsers: number;
  setupFee: number;
  setupFeeLabel: string;
  yearlySetupDiscount: string;
  trialDays: string;
  support: string;
  onboarding: string;
  avgAiResponsePerMau: string;
  desc?: string;
}

export const PLAN_TIERS: Record<string, PlanTierConfig> = {
  lite: {
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
    desc: 'Untuk UMKM pemula dengan 1 WhatsApp & 1 proyek',
  },
  bronze: {
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
    desc: 'Starter pack tim berkembang dengan 3 pengguna & support WhatsApp',
  },
  silver: {
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
    desc: 'Paket terpopuler untuk multi-proyek (3 siteplan), 2 nomor WA & 6 pengguna',
  },
  gold: {
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
    desc: 'Solusi bisnis skala besar dengan 4 nomor WA, 8 proyek & Dedicated PIC SLA 4 jam',
  },
  // ponytail: sentinel high value for unlimited developer mode, upgrade to isUnlimited boolean if needed
  developer: {
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
  custom: {
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
  // Legacy aliases for backwards compatibility:
  trial: {
    key: 'trial',
    name: 'Free Trial (Legacy)',
    price: 0,
    priceLabel: 'Gratis',
    yearlyPrice: 0,
    yearlyPriceLabel: 'Gratis',
    yearlySavings: '0%',
    maxAiResponses: 50,
    maxMau: 10,
    whatsappNumbers: 1,
    maxProjects: 1,
    maxUsers: 1,
    setupFee: 0,
    setupFeeLabel: 'Rp 0',
    yearlySetupDiscount: 'Gratis',
    trialDays: '14 hari',
    support: 'Panduan & email',
    onboarding: 'Self-service',
    avgAiResponsePerMau: '5 respons/kontak',
    desc: 'Evaluasi awal (Legacy)',
  },
  pro: {
    key: 'pro',
    name: 'Pro (Legacy)',
    price: 1500000,
    priceLabel: 'Rp 1.500k/bln',
    yearlyPrice: 1500000,
    yearlyPriceLabel: 'Rp 1.500k/bln',
    yearlySavings: '0%',
    maxAiResponses: 15000,
    maxMau: 2000,
    whatsappNumbers: 2,
    maxProjects: 3,
    maxUsers: 6,
    setupFee: 500000,
    setupFeeLabel: 'Rp 500.000',
    yearlySetupDiscount: 'Gratis',
    trialDays: '14 hari',
    support: 'WhatsApp, 1x24 jam',
    onboarding: '1x sesi online',
    avgAiResponsePerMau: '7.5 respons/kontak',
    desc: 'Pro Tier (Legacy)',
  },
  business: {
    key: 'business',
    name: 'Business (Legacy)',
    price: 2500000,
    priceLabel: 'Rp 2.500k/bln',
    yearlyPrice: 2500000,
    yearlyPriceLabel: 'Rp 2.500k/bln',
    yearlySavings: '0%',
    maxAiResponses: 50000,
    maxMau: 8000,
    whatsappNumbers: 4,
    maxProjects: 8,
    maxUsers: 12,
    setupFee: 0,
    setupFeeLabel: 'Rp 0',
    yearlySetupDiscount: 'Gratis',
    trialDays: '14 hari',
    support: 'Dedicated PIC',
    onboarding: '3x sesi online',
    avgAiResponsePerMau: '6.2 respons/kontak',
    desc: 'Business Tier (Legacy)',
  },
  enterprise: {
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
};

// ponytail: Top-up & add-on catalog per TIER_FEATURE_GUIDE.md
export const TOPUP_CATALOG: Record<
  string,
  {
    key: string;
    category: 'mau' | 'ai' | 'booster' | 'addon';
    name: string;
    mau?: number;
    ai?: number;
    whatsapp?: number;
    users?: number;
    projects?: number;
    price: number;
    desc: string;
  }
> = {
  MAU_S: {
    key: 'MAU_S',
    category: 'mau',
    name: 'Top-Up MAU S',
    mau: 500,
    price: 90000,
    desc: '+500 MAU sampai akhir bulan',
  },
  MAU_M: {
    key: 'MAU_M',
    category: 'mau',
    name: 'Top-Up MAU M',
    mau: 1000,
    price: 150000,
    desc: '+1.000 MAU sampai akhir bulan',
  },
  MAU_L: {
    key: 'MAU_L',
    category: 'mau',
    name: 'Top-Up MAU L',
    mau: 2500,
    price: 325000,
    desc: '+2.500 MAU sampai akhir bulan',
  },
  AI_S: {
    key: 'AI_S',
    category: 'ai',
    name: 'Top-Up AI S',
    ai: 1000,
    price: 60000,
    desc: '+1.000 respons AI (tidak hangus)',
  },
  AI_M: {
    key: 'AI_M',
    category: 'ai',
    name: 'Top-Up AI M',
    ai: 5000,
    price: 200000,
    desc: '+5.000 respons AI (tidak hangus)',
  },
  AI_L: {
    key: 'AI_L',
    category: 'ai',
    name: 'Top-Up AI L',
    ai: 10000,
    price: 400000,
    desc: '+10.000 respons AI (tidak hangus)',
  },
  BOOSTER_S: {
    key: 'BOOSTER_S',
    category: 'booster',
    name: 'Booster S',
    mau: 500,
    ai: 2000,
    price: 160000,
    desc: '+500 MAU & +2.000 respons AI',
  },
  BOOSTER_M: {
    key: 'BOOSTER_M',
    category: 'booster',
    name: 'Booster M',
    mau: 1000,
    ai: 4000,
    price: 290000,
    desc: '+1.000 MAU & +4.000 respons AI',
  },
  BOOSTER_L: {
    key: 'BOOSTER_L',
    category: 'booster',
    name: 'Booster L',
    mau: 2500,
    ai: 10000,
    price: 650000,
    desc: '+2.500 MAU & +10.000 respons AI',
  },
  ADDON_WA: {
    key: 'ADDON_WA',
    category: 'addon',
    name: 'Tambah Nomor WhatsApp',
    whatsapp: 1,
    price: 150000,
    desc: '+1 slot nomor WhatsApp',
  },
  ADDON_USER: {
    key: 'ADDON_USER',
    category: 'addon',
    name: 'Tambah User Staf',
    users: 1,
    price: 50000,
    desc: '+1 slot user staf',
  },
  ADDON_PROJECT: {
    key: 'ADDON_PROJECT',
    category: 'addon',
    name: 'Setup Proyek Tambahan',
    projects: 1,
    price: 500000,
    desc: '+1 slot proyek siteplan',
  },
};

// ponytail: helper ringkas kapasitas limit tier tenant tanpa abstraksi berlebih
export function resolveTenantCapacity(metadata: any) {
  const raw = metadata?.plan ? String(metadata.plan).toLowerCase() : null;
  const extraWa = Number(metadata?.extraWhatsapp) || 0;
  const extraUsers = Number(metadata?.extraUsers) || 0;
  const extraProj = Number(metadata?.extraProjects) || 0;
  const extraMau = Number(metadata?.extraMau) || 0;
  const extraAi = Number(metadata?.extraAiResponses) || 0;

  if (!raw) {
    return {
      planKey: null,
      planName: 'Tanpa Paket',
      maxWhatsapp: extraWa,
      maxProjects: extraProj,
      maxUsers: 1 + extraUsers,
      maxMau: extraMau,
      maxAiResponses: extraAi,
      extraMau,
      extraAiResponses: extraAi,
      extraWhatsapp: extraWa,
      extraUsers: extraUsers,
      extraProjects: extraProj,
      isDeveloper: false,
    };
  }
  const cfg = PLAN_TIERS[raw] || PLAN_TIERS.lite;
  const isDeveloper = raw === 'developer';
  return {
    planKey: raw,
    planName: cfg.name,
    maxWhatsapp: isDeveloper ? 999 : cfg.whatsappNumbers + extraWa,
    maxProjects: isDeveloper ? 999 : cfg.maxProjects + extraProj,
    maxUsers: isDeveloper ? 999 : cfg.maxUsers + extraUsers,
    maxMau: isDeveloper ? 999999999 : (cfg.maxMau || 0) + extraMau,
    maxAiResponses: isDeveloper
      ? 999999999
      : (cfg.maxAiResponses || 0) + extraAi,
    extraMau,
    extraAiResponses: extraAi,
    extraWhatsapp: extraWa,
    extraUsers: extraUsers,
    extraProjects: extraProj,
    isDeveloper,
  };
}

// ponytail: feature gating helper ringkas - cek hak akses fitur eksklusif per tier
export function isFeatureAllowed(
  metadata: any,
  feature:
    | 'mediaGallery'
    | 'ocrExtract'
    | 'customFollowUp'
    | 'manualFollowUp'
    | 'autoTopUp',
): boolean {
  const raw = metadata?.plan ? String(metadata.plan).toLowerCase() : null;
  if (!raw) return false;
  if (
    raw === 'developer' ||
    raw === 'gold' ||
    raw === 'silver' ||
    raw === 'enterprise'
  ) {
    return true;
  }
  // Lite & Bronze tidak memiliki fitur-fitur eksklusif ini (ditandai '-' di matriks)
  return false;
}

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataAgentService: DataAgentService,
  ) {}

  async getTenantQuota(tenantId: string, preloadedTenant?: any) {
    let tenant =
      preloadedTenant ||
      (await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          whatsappInstances: { select: { instanceName: true } },
        },
      }));

    if (!tenant) {
      const user = await this.prisma.user.findUnique({
        where: { id: tenantId },
        include: {
          tenant: {
            include: {
              whatsappInstances: { select: { instanceName: true } },
            },
          },
        },
      });
      if (user && user.tenant) {
        tenant = user.tenant;
      }
    }

    if (!tenant) {
      tenant = await this.prisma.tenant.findFirst({
        include: {
          whatsappInstances: { select: { instanceName: true } },
        },
      });
    }

    if (!tenant) throw new NotFoundException('Tenant not found');

    const meta = tenant.metadata || {};
    const rawPlan = meta.plan ? String(meta.plan).toLowerCase() : null;
    const planKey =
      rawPlan && rawPlan !== 'none' && rawPlan !== 'null' ? rawPlan : null;
    const tierConfig =
      planKey && PLAN_TIERS[planKey] ? PLAN_TIERS[planKey] : null;

    const extraMau = Number(meta.extraMau) || 0;
    const extraAi = Number(meta.extraAiResponses) || 0;

    const baseMau =
      typeof meta.maxMau === 'number'
        ? meta.maxMau
        : tierConfig
          ? tierConfig.maxMau
          : 0;
    const maxMau = planKey === 'developer' ? 999999999 : baseMau + extraMau;

    const baseAi =
      typeof meta.maxAiResponses === 'number'
        ? meta.maxAiResponses
        : tierConfig
          ? tierConfig.maxAiResponses
          : 0;
    const maxAiResponses =
      planKey === 'developer' ? 999999999 : baseAi + extraAi;

    const planPrice =
      typeof meta.planPrice === 'number'
        ? meta.planPrice
        : tierConfig
          ? tierConfig.price
          : 0;
    const planName =
      meta.planName || (tierConfig ? tierConfig.name : 'Belum Ada Paket');
    const priceLabel = tierConfig
      ? tierConfig.priceLabel
      : planPrice > 0
        ? `Rp ${planPrice.toLocaleString('id-ID')}/bln`
        : 'Belum Berlangganan';

    const instanceNames = tenant.whatsappInstances
      ? tenant.whatsappInstances.map((i: any) => i.instanceName)
      : (
          await this.prisma.whatsappInstance.findMany({
            where: { tenantId },
            select: { instanceName: true },
          })
        ).map((i) => i.instanceName);

    let mauUsed = 0;
    let aiResponsesUsed = 0;

    if (instanceNames.length > 0) {
      // 1 nomor unik yang menghubungi bot = 1 MAU
      const conversations = await this.prisma.conversation.findMany({
        where: {
          instanceName: { in: instanceNames },
          contact: { phone: { not: { contains: 'broadcast' } } },
        },
        select: { contactId: true },
        distinct: ['contactId'],
      });
      mauUsed = conversations.length;

      // 1 bubble balasan bot = 1 AI response
      aiResponsesUsed = await this.prisma.message.count({
        where: {
          senderType: 'bot',
          conversation: { instanceName: { in: instanceNames } },
        },
      });
    }

    // ponytail: soft-limit 110% MAU (grace period 10%)
    const softLimitMau = Math.round(maxMau * 1.1);
    const isGracePeriod =
      planKey !== 'developer' &&
      maxMau > 0 &&
      mauUsed > maxMau &&
      mauUsed <= softLimitMau;
    const isMauExceeded =
      planKey === 'developer'
        ? false
        : maxMau > 0
          ? mauUsed > softLimitMau
          : false;

    // ponytail: kalkulasi penggunaan kapasitas entitas add-on (staf, proyek, wa)
    const capacity = resolveTenantCapacity(meta);
    const usersUsed =
      tenant.users?.length ??
      (this.prisma.user?.count
        ? ((await Promise.resolve(
            this.prisma.user.count({ where: { tenantId } }),
          ).catch(() => 0)) ?? 0)
        : 0);
    const projectsUsed =
      tenant._count?.resourceGroups ??
      (this.prisma.resourceGroup?.count
        ? ((await Promise.resolve(
            this.prisma.resourceGroup.count({ where: { tenantId } }),
          ).catch(() => 0)) ?? 0)
        : 0);
    const whatsappUsed = instanceNames.length;

    return {
      plan: planKey,
      planName,
      planPrice,
      priceLabel,
      mauUsed,
      maxMau,
      baseMau,
      extraMau,
      softLimitMau,
      isGracePeriod,
      mauPercent:
        planKey === 'developer'
          ? 0
          : maxMau > 0
            ? Math.min(100, Math.round((mauUsed / maxMau) * 100))
            : 0,
      isMauExceeded,
      aiResponsesUsed,
      maxAiResponses,
      baseAiResponses: baseAi,
      extraAiResponses: extraAi,
      aiResponsesPercent:
        planKey === 'developer'
          ? 0
          : maxAiResponses > 0
            ? Math.min(
                100,
                Math.round((aiResponsesUsed / maxAiResponses) * 100),
              )
            : 0,
      isAiResponsesExceeded:
        planKey === 'developer'
          ? false
          : maxAiResponses > 0
            ? aiResponsesUsed >= maxAiResponses
            : false,
      usersUsed,
      maxUsers: capacity.maxUsers,
      extraUsers: capacity.extraUsers,
      projectsUsed,
      maxProjects: capacity.maxProjects,
      extraProjects: capacity.extraProjects,
      whatsappUsed,
      maxWhatsapp: capacity.maxWhatsapp,
      extraWhatsapp: capacity.extraWhatsapp,
      autoTopUpEnabled: Boolean(meta.autoTopUpEnabled),
      autoTopUpMonthlyLimit: Number(meta.autoTopUpMonthlyLimit || 3),
      autoTopUpCount:
        meta.autoTopUpMonth === new Date().toISOString().slice(0, 7)
          ? Number(meta.autoTopUpCount) || 0
          : 0,
      quotaAlerts: Array.isArray(meta.quotaAlerts) ? meta.quotaAlerts : [],
      topups: Array.isArray(meta.topups) ? meta.topups : [],
    };
  }

  async updateTenantQuota(
    tenantId: string,
    data: {
      plan?: string | null;
      planName?: string | null;
      maxMau?: number;
      maxAiResponses?: number;
      planPrice?: number;
    },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const meta = (tenant.metadata as any) || {};

    // Allow setting / resetting plan to null
    if (
      data.plan === null ||
      data.plan === '' ||
      data.plan === 'none' ||
      data.plan === 'null'
    ) {
      const updated = await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          metadata: {
            ...meta,
            plan: null,
            planName: null,
            planPrice: typeof data.planPrice === 'number' ? data.planPrice : 0,
            maxMau: typeof data.maxMau === 'number' ? data.maxMau : 0,
            maxAiResponses:
              typeof data.maxAiResponses === 'number' ? data.maxAiResponses : 0,
          },
        },
      });
      return this.getTenantQuota(tenantId, updated);
    }

    const rawPlan = data.plan
      ? String(data.plan).toLowerCase()
      : meta.plan
        ? String(meta.plan).toLowerCase()
        : null;
    const planKey = (rawPlan as keyof typeof PLAN_TIERS) || null;
    const tierConfig = planKey ? PLAN_TIERS[planKey] : null;

    const maxMau =
      typeof data.maxMau === 'number'
        ? data.maxMau
        : tierConfig
          ? tierConfig.maxMau
          : (meta.maxMau ?? 0);
    const maxAiResponses =
      typeof data.maxAiResponses === 'number'
        ? data.maxAiResponses
        : tierConfig
          ? tierConfig.maxAiResponses
          : (meta.maxAiResponses ?? 0);
    const planPrice =
      typeof data.planPrice === 'number'
        ? data.planPrice
        : tierConfig
          ? tierConfig.price
          : (meta.planPrice ?? 0);
    const planName =
      data.planName ||
      (tierConfig ? tierConfig.name : meta.planName || 'Belum Ada Paket');

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        metadata: {
          ...meta,
          plan: planKey,
          planName,
          planPrice,
          maxMau,
          maxAiResponses,
        },
      },
    });

    return this.getTenantQuota(tenantId, updated);
  }

  // ponytail: katalog top-up & add-on
  getTopUpCatalog() {
    return Object.values(TOPUP_CATALOG);
  }

  // ponytail: injeksi / pembelian paket top-up atau add-on kapasitas
  async applyTenantTopUp(
    tenantId: string,
    data: {
      itemKey: string;
      mau?: number;
      ai?: number;
      whatsapp?: number;
      users?: number;
      projects?: number;
      notes?: string;
    },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const meta = (tenant.metadata as any) || {};
    const catalogItem = TOPUP_CATALOG[data.itemKey];
    if (!catalogItem && data.itemKey !== 'CUSTOM') {
      throw new BadRequestException(
        `Paket top-up "${data.itemKey}" tidak valid.`,
      );
    }

    const addMau = Number(data.mau ?? catalogItem?.mau ?? 0);
    const addAi = Number(data.ai ?? catalogItem?.ai ?? 0);
    const addWa = Number(data.whatsapp ?? catalogItem?.whatsapp ?? 0);
    const addUsers = Number(data.users ?? catalogItem?.users ?? 0);
    const addProj = Number(data.projects ?? catalogItem?.projects ?? 0);

    const newRecord = {
      id: `topup-${Date.now()}`,
      itemKey: data.itemKey,
      name: catalogItem?.name || 'Top-Up Kustom',
      price: catalogItem?.price || 0,
      mau: addMau,
      ai: addAi,
      whatsapp: addWa,
      users: addUsers,
      projects: addProj,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
    };

    const existingTopups = Array.isArray(meta.topups) ? meta.topups : [];
    const updatedMeta = {
      ...meta,
      extraMau: (Number(meta.extraMau) || 0) + addMau,
      extraAiResponses: (Number(meta.extraAiResponses) || 0) + addAi,
      extraWhatsapp: (Number(meta.extraWhatsapp) || 0) + addWa,
      extraUsers: (Number(meta.extraUsers) || 0) + addUsers,
      extraProjects: (Number(meta.extraProjects) || 0) + addProj,
      topups: [newRecord, ...existingTopups],
    };

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { metadata: updatedMeta },
    });

    return this.getTenantQuota(tenantId, updated);
  }

  // ponytail: pengaturan auto top-up booster s saat kuota 100% (eksklusif Silver ke atas)
  async updateAutoTopUpSettings(
    tenantId: string,
    data: { autoTopUpEnabled: boolean; autoTopUpMonthlyLimit?: number },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (
      data.autoTopUpEnabled &&
      !isFeatureAllowed(tenant.metadata, 'autoTopUp')
    ) {
      throw new BadRequestException(
        'Fitur Auto Top-Up Booster S eksklusif untuk paket Silver ke atas.',
      );
    }

    const meta = (tenant.metadata as any) || {};
    const updatedMeta = {
      ...meta,
      autoTopUpEnabled: Boolean(data.autoTopUpEnabled),
      autoTopUpMonthlyLimit: Number(
        data.autoTopUpMonthlyLimit ?? meta.autoTopUpMonthlyLimit ?? 3,
      ),
    };

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { metadata: updatedMeta },
    });

    return this.getTenantQuota(tenantId, updated);
  }

  // ponytail: evaluasi & pemicu notifikasi kuota 80% & 100% ke nomor owner via WAHA & alerts dashboard
  async checkAndNotifyQuota(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        whatsappInstances: { select: { instanceName: true, status: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const quota = await this.getTenantQuota(tenantId, tenant);
    if (!quota.plan || quota.plan === 'developer') return quota;

    const meta = (tenant.metadata as any) || {};
    const currentMonth = new Date().toISOString().slice(0, 7);
    const alerts = Array.isArray(meta.quotaAlerts) ? [...meta.quotaAlerts] : [];
    let shouldUpdateMeta = false;

    const mauRatio = quota.maxMau > 0 ? quota.mauUsed / quota.maxMau : 0;
    const aiRatio =
      quota.maxAiResponses > 0
        ? quota.aiResponsesUsed / quota.maxAiResponses
        : 0;
    const maxRatio = Math.max(mauRatio, aiRatio);

    const ownerPhone = tenant.ownerChatId || tenant.phone;
    const activeInstance =
      tenant.whatsappInstances.find(
        (i) => i.status === 'WORKING' || i.status === 'CONNECTED',
      )?.instanceName || tenant.whatsappInstances[0]?.instanceName;

    // Peringatan 80%
    if (maxRatio >= 0.8 && meta.notified80Month !== currentMonth) {
      meta.notified80Month = currentMonth;
      alerts.unshift({
        type: '80%',
        message: `Peringatan: Pemakaian kuota (${Math.round(maxRatio * 100)}%) mendekati batas. Segera lakukan top-up agar bot tidak berhenti.`,
        createdAt: new Date().toISOString(),
      });
      shouldUpdateMeta = true;

      if (ownerPhone && activeInstance) {
        const text = `⚠️ *Peringatan Kuota Platform ZAF (80%)*\nHalo ${tenant.name}, pemakaian kuota chatbot Anda telah mencapai ${Math.round(maxRatio * 100)}%.\nSilakan lakukan top-up di dashboard agar auto-reply tetap berjalan lancar.`;
        this.sendWahaDirect(activeInstance, ownerPhone, text).catch(() => null);
      }
    }

    // Peringatan 100%
    if (maxRatio >= 1.0 && meta.notified100Month !== currentMonth) {
      meta.notified100Month = currentMonth;
      alerts.unshift({
        type: '100%',
        message: `Perhatian: Kuota chatbot 100% habis. Percakapan baru otomatis dialihkan ke admin manusia.`,
        createdAt: new Date().toISOString(),
      });
      shouldUpdateMeta = true;

      if (ownerPhone && activeInstance) {
        const text = `🚨 *Peringatan Kuota Platform ZAF (100% Habis)*\nHalo ${tenant.name}, kuota chatbot Anda telah habis. Sesuai aturan, percakapan pelanggan baru otomatis dialihkan ke admin manusia di dashboard. Beli booster kuota untuk mengaktifkan kembali bot AI.`;
        this.sendWahaDirect(activeInstance, ownerPhone, text).catch(() => null);
      }
    }

    if (shouldUpdateMeta) {
      const updated = await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          metadata: {
            ...meta,
            quotaAlerts: alerts.slice(0, 10),
          },
        },
      });
      return this.getTenantQuota(tenantId, updated);
    }

    return quota;
  }

  // ponytail: kirim langsung notifikasi via WAHA API native fetch tanpa circular dependency
  private async sendWahaDirect(
    sessionName: string,
    phone: string,
    text: string,
  ) {
    try {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const chatId = cleanPhone.includes('@')
        ? cleanPhone
        : `${cleanPhone}@c.us`;
      const wahaUrl = process.env.WAHA_API_URL || 'http://127.0.0.1:3000';
      const apiKey = process.env.WAHA_API_KEY || '';
      await fetch(`${wahaUrl}/api/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
        },
        body: JSON.stringify({ session: sessionName, chatId, text }),
      });
    } catch {}
  }

  async getDashboardOverview(userId: string) {
    // 1. Cek langsung jika input adalah ID Tenant
    const directTenant = await this.prisma.tenant.findUnique({
      where: { id: userId },
    });

    let tenant = directTenant;
    let tenantId = directTenant?.id;

    if (!tenant) {
      // Mock fallback for frontend testing
      if (userId.includes('@')) {
        const owner = await this.prisma.user.findUnique({
          where: { email: userId },
        });
        if (owner) userId = owner.id;
      } else if (userId === 'demo' || userId.startsWith('u-')) {
        // Jika format u-{tenantId}, coba ambil tenantId-nya
        const potentialTenantId = userId.startsWith('u-')
          ? userId.replace('u-', '')
          : null;
        if (potentialTenantId) {
          const matchedTenant = await this.prisma.tenant.findUnique({
            where: { id: potentialTenantId },
          });
          if (matchedTenant) {
            tenant = matchedTenant;
            tenantId = matchedTenant.id;
          }
        }

        if (!tenant) {
          const firstOwner = await this.prisma.user.findFirst({
            where: {
              role: { in: ['manager', 'owner', 'ADMIN', 'administrator'] },
              tenantId: { not: null },
            },
            include: { tenant: true },
          });
          if (firstOwner && firstOwner.tenant) {
            tenant = firstOwner.tenant;
            tenantId = firstOwner.tenantId || undefined;
          }
        }
      }

      if (!tenant) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { tenant: true },
        });

        if (user && user.tenantId && user.tenant) {
          tenant = user.tenant;
          tenantId = user.tenantId;
        } else {
          // Fallback ke tenant pertama di database agar demo/superadmin tidak 404
          const fallbackTenant = await this.prisma.tenant.findFirst();
          if (fallbackTenant) {
            tenant = fallbackTenant;
            tenantId = fallbackTenant.id;
          } else {
            throw new NotFoundException(
              'User tidak terhubung dengan tenant manapun',
            );
          }
        }
      }
    }

    if (!tenantId || !tenant) {
      throw new NotFoundException('Tenant tidak ditemukan');
    }

    // Ambil data untuk dashboard UMKM
    const productsCount = await this.prisma.product.count({
      where: { tenantId },
    });
    const lowStockCount = await this.prisma.product.count({
      where: { tenantId, stock: { lt: 5 } },
    });

    const knowledgeCount = await this.prisma.knowledgeBase.count({
      where: { tenantId },
    });

    // Ambil penjualan hari ini (sederhana)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const salesRecords = await this.prisma.salesRecord.findMany({
      where: {
        tenantId,
        soldAt: { gte: today },
      },
    });

    const omsetHariIni = salesRecords.reduce(
      (total, record) => total + Number(record.totalPrice),
      0,
    );

    // Chat metrics — query through instanceName since Message/Conversation don't have tenantId
    const instances = await this.prisma.whatsappInstance.findMany({
      where: { tenantId },
      select: { instanceName: true },
    });
    const instanceNames = instances.map((i) => i.instanceName);
    const instanceFilter =
      instanceNames.length > 0
        ? { conversation: { instanceName: { in: instanceNames } } }
        : {};
    const instanceFilterConv =
      instanceNames.length > 0 ? { instanceName: { in: instanceNames } } : {};

    const totalMessages = await this.prisma.message.count({
      where: instanceFilter,
    });
    const botMessages = await this.prisma.message.count({
      where: { ...instanceFilter, senderType: 'bot' },
    });
    const totalChats = await this.prisma.conversation.count({
      where: instanceFilterConv,
    });

    // Revenue trend (last 7 days — real data)
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const revenueTrend: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      const daySales = await this.prisma.salesRecord.findMany({
        where: { tenantId, soldAt: { gte: d, lt: nextDay } },
      });
      const dayTotal = daySales.reduce(
        (sum, r) => sum + Number(r.totalPrice),
        0,
      );
      revenueTrend.push({ label: dayNames[d.getDay()], value: dayTotal });
    }

    // Basic Insight
    const topProduct = await this.prisma.product.findFirst({
      where: { tenantId },
      orderBy: { stock: 'asc' },
    });

    // Quota usage (MAU & AI responses)
    const quota = await this.getTenantQuota(tenantId, tenant);

    return {
      tenant,
      metrics: {
        productsCount,
        lowStockCount,
        knowledgeCount,
        omsetHariIni,
        salesCountToday: salesRecords.length,
        totalChats,
        totalMessages,
        botMessages,
        botSuccessRate:
          totalMessages > 0
            ? Math.round((botMessages / totalMessages) * 100)
            : 0,
      },
      quota,
      revenueTrend,
      insights: {
        topProduct: topProduct?.name || '-',
        topProductStock: topProduct?.stock || 0,
      },
    };
  }

  async updateTenantSettings(
    userId: string,
    data: {
      agentName?: string;
      agentTone?: string;
      phone?: string;
      greetingMsg?: string;
      ownerChatId?: string;
      systemPrompt?: string;
      operatingHours?: string;
      address?: string;
      colorPalette?: { primary?: string; secondary?: string; accent?: string };
    },
  ) {
    let resolvedTenantId: string | null = null;

    // 1. Cek apakah userId langsung merupakan UUID Tenant
    const directTenant = await this.prisma.tenant.findUnique({
      where: { id: userId },
    });
    if (directTenant) {
      resolvedTenantId = directTenant.id;
    } else {
      if (userId.includes('@')) {
        const owner = await this.prisma.user.findUnique({
          where: { email: userId },
        });
        if (owner) userId = owner.id;
      } else if (userId === 'demo' || userId.startsWith('u-')) {
        const potentialTenantId = userId.startsWith('u-')
          ? userId.replace('u-', '')
          : null;
        if (potentialTenantId) {
          const matchedTenant = await this.prisma.tenant.findUnique({
            where: { id: potentialTenantId },
          });
          if (matchedTenant) {
            resolvedTenantId = matchedTenant.id;
          }
        }
        if (!resolvedTenantId) {
          const firstOwner = await this.prisma.user.findFirst({
            where: {
              role: { in: ['manager', 'owner', 'ADMIN', 'administrator'] },
              tenantId: { not: null },
            },
          });
          if (firstOwner && firstOwner.tenantId) {
            resolvedTenantId = firstOwner.tenantId;
          }
        }
      }

      if (!resolvedTenantId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { tenant: true },
        });
        if (user && user.tenantId) {
          resolvedTenantId = user.tenantId;
        } else {
          const fallbackTenant = await this.prisma.tenant.findFirst();
          if (fallbackTenant) {
            resolvedTenantId = fallbackTenant.id;
          }
        }
      }
    }

    if (!resolvedTenantId) {
      throw new NotFoundException('Tenant not found');
    }

    const { colorPalette, ...otherData } = data;
    const updatePayload: any = { ...otherData };

    if (colorPalette) {
      const currentTenant = await this.prisma.tenant.findUnique({
        where: { id: resolvedTenantId },
      });
      const existingMetadata = (currentTenant?.metadata as any) || {};
      updatePayload.metadata = {
        ...existingMetadata,
        colorPalette,
      };
    }

    return this.prisma.tenant.update({
      where: { id: resolvedTenantId },
      data: updatePayload,
    });
  }

  async getEffectivePrompt(userId: string): Promise<string> {
    let resolvedTenantId: string | null = null;
    const directTenant = await this.prisma.tenant.findUnique({
      where: { id: userId },
    });
    if (directTenant) {
      resolvedTenantId = directTenant.id;
    } else {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      resolvedTenantId =
        user?.tenantId || (await this.prisma.tenant.findFirst())?.id || null;
    }

    if (!resolvedTenantId) throw new NotFoundException('Tenant not found');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: resolvedTenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const agentName = tenant.agentName || 'Luna';
    const botTone = tenant.agentTone || 'ramah dan profesional';
    const tenantName = tenant.name || 'Perusahaan Kami';
    const fallbackContact = tenant.phone
      ? `di nomor WA: ${tenant.phone}`
      : 'langsung ke tim marketing kami';
    const operatingHours = tenant.operatingHours || 'Setiap Hari';
    const storeAddress = tenant.address || 'Hanya Online';
    const currentTime = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
    });

    const defaultPrompt = `Anda adalah Customer Service bernama {agentName} dari toko {tenantName}. Tugas Anda adalah melayani pelanggan terkait produk dan layanan kami.
Gaya bahasa Anda: {botTone}.
Waktu saat ini: {currentTime}. Jam Operasional Toko: {operatingHours}. Alamat Toko: {storeAddress}.
Jika pelanggan menghubungi di luar jam operasional, infokan dengan ramah bahwa toko sedang tutup atau admin sedang istirahat dan akan segera dibalas saat jam buka.
Berikan jawaban yang natural seperti CS manusia sungguhan. Jangan menggunakan bahasa kaku atau gaya bahasa AI.`;

    let prompt = tenant.systemPrompt || defaultPrompt;
    prompt = prompt
      .replaceAll('{agentName}', agentName)
      .replaceAll('{tenantName}', tenantName)
      .replaceAll('{botTone}', botTone)
      .replaceAll('{currentTime}', currentTime)
      .replaceAll('{operatingHours}', operatingHours)
      .replaceAll('{storeAddress}', storeAddress)
      .replaceAll('{fallbackContact}', fallbackContact);

    if (
      tenant.systemPrompt &&
      !tenant.systemPrompt.includes('{botTone}') &&
      botTone
    ) {
      prompt += `\n\n[GAYA BAHASA & NADA BICARA CS]:\n${botTone}`;
    }

    return prompt;
  }

  async getAgentReport(userId: string) {
    if (userId.includes('@')) {
      const owner = await this.prisma.user.findUnique({
        where: { email: userId },
      });
      if (userId) userId = owner?.id || userId;
    } else if (userId === 'demo' || userId.startsWith('u-')) {
      const firstOwner = await this.prisma.user.findFirst({
        where: { role: 'owner' },
      });
      if (firstOwner) userId = firstOwner.id;
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.tenantId)
      throw new NotFoundException('Tenant not found');
    const tenantId = user.tenantId;

    // KPI — real data, query through instanceName
    const instances = await this.prisma.whatsappInstance.findMany({
      where: { tenantId },
      select: { instanceName: true },
    });
    const instanceNames = instances.map((i) => i.instanceName);
    const instanceFilter =
      instanceNames.length > 0
        ? { conversation: { instanceName: { in: instanceNames } } }
        : {};
    const instanceFilterConv =
      instanceNames.length > 0 ? { instanceName: { in: instanceNames } } : {};

    const pesanMasuk = await this.prisma.message.count({
      where: { ...instanceFilter, senderType: { not: 'bot' } },
    });
    const dibalasBot = await this.prisma.message.count({
      where: { ...instanceFilter, senderType: 'bot' },
    });
    const pesananViaBot = await this.prisma.salesRecord.count({
      where: { tenantId, source: 'BOT_CS' },
    });
    const pelangganBaru = await this.prisma.contact.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    // 5 Pesanan Terakhir
    const recentSales = await this.prisma.salesRecord.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Tren 7 hari — real data
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const trenPesan: { label: string; masuk: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      const count = await this.prisma.message.count({
        where: { ...instanceFilter, createdAt: { gte: d, lt: nextDay } },
      });
      trenPesan.push({ label: dayNames[d.getDay()], masuk: count });
    }

    return {
      kpi: {
        pesanMasuk,
        dibalasBot,
        pesananViaBot,
        pelangganBaru,
      },
      pesananTerakhir: recentSales.map((r) => ({
        id: r.id,
        waktu: new Date(r.createdAt).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        pelanggan: r.customerName || 'Unknown',
        produk: (r.attributes as any)?.items || 'Item',
        qty: r.quantity,
        total: Number(r.totalPrice),
      })),
      trenPesan,
    };
  }

  async getTenantProducts(userId: string) {
    if (userId.includes('@')) {
      const owner = await this.prisma.user.findUnique({
        where: { email: userId },
      });
      if (owner) userId = owner.id;
    } else if (userId === 'demo' || userId.startsWith('u-')) {
      const firstOwner = await this.prisma.user.findFirst({
        where: { role: 'owner' },
      });
      if (firstOwner) userId = firstOwner.id;
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.tenantId) throw new NotFoundException('Tenant not found');
    return this.prisma.product.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addTenantProduct(
    userId: string,
    data: {
      name: string;
      category: string;
      price: number;
      stock: number;
      description?: string;
      attributes?: any;
    },
  ) {
    if (userId.includes('@')) {
      const owner = await this.prisma.user.findUnique({
        where: { email: userId },
      });
      if (owner) userId = owner.id;
    } else if (userId === 'demo' || userId.startsWith('u-')) {
      const firstOwner = await this.prisma.user.findFirst({
        where: { role: 'owner' },
      });
      if (firstOwner) userId = firstOwner.id;
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.tenantId) throw new NotFoundException('Tenant not found');

    const product = await this.prisma.product.create({
      data: {
        tenantId: user.tenantId,
        name: data.name,
        category: data.category,
        price: data.price,
        stock: data.stock,
        description: data.description || '',
        attributes: data.attributes || {},
      },
    });

    // Trigger sync ke vector db agar agent mengenali produk baru
    await this.dataAgentService.syncKnowledgeBase(user.tenantId);

    return product;
  }

  async updateTenantProduct(
    userId: string,
    productId: string,
    data: Partial<{
      name: string;
      category: string;
      price: number;
      stock: number;
      description: string;
      attributes: any;
    }>,
  ) {
    if (userId.includes('@')) {
      const owner = await this.prisma.user.findUnique({
        where: { email: userId },
      });
      if (owner) userId = owner.id;
    } else if (userId === 'demo' || userId.startsWith('u-')) {
      const firstOwner = await this.prisma.user.findFirst({
        where: { role: 'owner' },
      });
      if (firstOwner) userId = firstOwner.id;
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.tenantId) throw new NotFoundException('Tenant not found');

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data,
    });

    await this.dataAgentService.syncKnowledgeBase(user.tenantId);
    return updated;
  }

  async deleteTenantProduct(userId: string, productId: string) {
    if (userId.includes('@')) {
      const owner = await this.prisma.user.findUnique({
        where: { email: userId },
      });
      if (owner) userId = owner.id;
    } else if (userId === 'demo' || userId.startsWith('u-')) {
      const firstOwner = await this.prisma.user.findFirst({
        where: { role: 'owner' },
      });
      if (firstOwner) userId = firstOwner.id;
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.tenantId) throw new NotFoundException('Tenant not found');

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.product.delete({ where: { id: productId } });

    await this.dataAgentService.syncKnowledgeBase(user.tenantId);
    return { success: true };
  }

  async getTenantKnowledge(userId: string) {
    if (userId.includes('@')) {
      const owner = await this.prisma.user.findUnique({
        where: { email: userId },
      });
      if (owner) userId = owner.id;
    } else if (userId === 'demo' || userId.startsWith('u-')) {
      const firstOwner = await this.prisma.user.findFirst({
        where: { role: 'owner' },
      });
      if (firstOwner) userId = firstOwner.id;
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.tenantId) throw new NotFoundException('Tenant not found');
    return this.prisma.knowledgeBase.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addTenantKnowledge(userId: string, content: string) {
    if (userId.includes('@')) {
      const owner = await this.prisma.user.findUnique({
        where: { email: userId },
      });
      if (owner) userId = owner.id;
    } else if (userId === 'demo' || userId.startsWith('u-')) {
      const firstOwner = await this.prisma.user.findFirst({
        where: { role: 'owner' },
      });
      if (firstOwner) userId = firstOwner.id;
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.tenantId) throw new NotFoundException('Tenant not found');

    const kb = await this.prisma.knowledgeBase.create({
      data: {
        tenantId: user.tenantId,
        content: content,
        metadata: { source: 'MANUAL_INPUT' },
      },
    });

    // Trigger sync ke vector db agar agent langsung mengingat fakta baru ini
    await this.dataAgentService.syncKnowledgeBase(user.tenantId);

    return kb;
  }

  async updateTenantKnowledge(
    userId: string,
    knowledgeId: string,
    content: string,
  ) {
    if (userId.includes('@')) {
      const owner = await this.prisma.user.findUnique({
        where: { email: userId },
      });
      if (owner) userId = owner.id;
    } else if (userId === 'demo' || userId.startsWith('u-')) {
      const firstOwner = await this.prisma.user.findFirst({
        where: { role: 'owner' },
      });
      if (firstOwner) userId = firstOwner.id;
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.tenantId) throw new NotFoundException('Tenant not found');

    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id: knowledgeId, tenantId: user.tenantId },
    });
    if (!kb) throw new NotFoundException('Knowledge not found');

    const updated = await this.prisma.knowledgeBase.update({
      where: { id: knowledgeId },
      data: { content },
    });

    await this.dataAgentService.syncKnowledgeBase(user.tenantId);
    return updated;
  }

  async deleteTenantKnowledge(userId: string, knowledgeId: string) {
    if (userId.includes('@')) {
      const owner = await this.prisma.user.findUnique({
        where: { email: userId },
      });
      if (owner) userId = owner.id;
    } else if (userId === 'demo' || userId.startsWith('u-')) {
      const firstOwner = await this.prisma.user.findFirst({
        where: { role: 'owner' },
      });
      if (firstOwner) userId = firstOwner.id;
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.tenantId) throw new NotFoundException('Tenant not found');

    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id: knowledgeId, tenantId: user.tenantId },
    });
    if (!kb) throw new NotFoundException('Knowledge not found');

    await this.prisma.knowledgeBase.delete({ where: { id: knowledgeId } });

    await this.dataAgentService.syncKnowledgeBase(user.tenantId);
    return { success: true };
  }

  async getTenantSales(userId: string) {
    if (userId.includes('@')) {
      const owner = await this.prisma.user.findUnique({
        where: { email: userId },
      });
      if (owner) userId = owner.id;
    } else if (userId === 'demo' || userId.startsWith('u-')) {
      const firstOwner = await this.prisma.user.findFirst({
        where: { role: 'owner' },
      });
      if (firstOwner) userId = firstOwner.id;
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.tenantId) throw new NotFoundException('Tenant not found');
    return this.prisma.salesRecord.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { soldAt: 'desc' },
      include: { product: true },
    });
  }

  async completeOnboarding(userId: string, dto: OnboardingDto) {
    if (userId.includes('@')) {
      const owner = await this.prisma.user.findUnique({
        where: { email: userId },
      });
      if (owner) userId = owner.id;
    } else if (userId === 'demo' || userId.startsWith('u-')) {
      const firstOwner = await this.prisma.user.findFirst({
        where: { role: 'owner' },
      });
      if (firstOwner) userId = firstOwner.id;
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.tenantId)
      throw new NotFoundException('Tenant not found');

    const tenant = await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        name: dto.storeName,
        category: dto.category,
        phone: dto.phone,
        address: dto.address,
        agentName: dto.agentName,
        agentTone: dto.agentTone,
        extraInfo: dto.instructions,
        isOnboarded: true,
        metadata: { botToken: dto.botToken || '' },
      },
    });

    // Trigger sync ke vector db agar agen mengetahui info toko yang baru disubmit
    await this.dataAgentService.syncKnowledgeBase(user.tenantId);

    return tenant;
  }

  // Superadmin: List all client tenants with user and enabledMenus
  async listAllClients() {
    const clients = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        whatsappInstances: { select: { instanceName: true } },
        _count: {
          select: {
            products: true,
            knowledgeBases: true,
            whatsappInstances: true,
          },
        },
      },
    });

    return Promise.all(
      clients.map(async (client) => {
        const quota = await this.getTenantQuota(client.id, client);
        return {
          ...client,
          quota,
        };
      }),
    );
  }

  // Superadmin: Create new tenant + manager account + menu configuration
  async createClient(data: {
    companyName: string;
    category?: string;
    managerName: string;
    managerEmail: string;
    managerPassword?: string;
    enabledMenus: string[];
  }) {
    const defaultPassword = data.managerPassword || 'Manager@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // 1. Create Tenant with enabledMenus in metadata
    const tenant = await this.prisma.tenant.create({
      data: {
        name: data.companyName,
        category: data.category || 'general',
        agentName: 'Asisten AI',
        metadata: {
          enabledMenus: data.enabledMenus,
          plan: null,
          planName: null,
          maxMau: 0,
          maxAiResponses: 0,
          planPrice: 0,
        },
      },
    });

    // 2. Create User Manager
    const user = await this.prisma.user.create({
      data: {
        name: data.managerName,
        email: data.managerEmail,
        password: hashedPassword,
        role: 'manager',
        tenantId: tenant.id,
      },
    });

    return {
      tenant,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      rawPassword: defaultPassword,
    };
  }

  // Superadmin: Update enabledMenus & category for a client
  async updateClientMenus(
    tenantId: string,
    enabledMenus: string[],
    category?: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const existingMeta = (tenant.metadata as any) || {};
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(category ? { category } : {}),
        metadata: {
          ...existingMeta,
          enabledMenus,
        },
      },
    });
  }

  // Superadmin: Update full tenant configuration & detail (WAHA, AI Quota, Prompt, Custom)
  async updateTenantDetail(
    tenantId: string,
    data: {
      name?: string;
      category?: string;
      phone?: string;
      address?: string;
      agentName?: string;
      agentTone?: string;
      systemPrompt?: string;
      metadata?: any;
    },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const existingMeta = (tenant.metadata as any) || {};
    const newMeta = data.metadata
      ? { ...existingMeta, ...data.metadata }
      : existingMeta;

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.category ? { category: data.category } : {}),
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.address ? { address: data.address } : {}),
        ...(data.agentName ? { agentName: data.agentName } : {}),
        ...(data.agentTone ? { agentTone: data.agentTone } : {}),
        ...(data.systemPrompt ? { systemPrompt: data.systemPrompt } : {}),
        metadata: newMeta,
      },
    });
  }

  // Superadmin / Manager: Buat akun staf/admin tambahan untuk tenant tertentu
  async createTenantStaff(
    tenantId: string,
    data: {
      name: string;
      email: string;
      password?: string;
      role?: string;
      allowedMenus?: string[];
    },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // ponytail: validasi batas kuota staf admin/sales per tier
    const capacity = resolveTenantCapacity(tenant.metadata);
    if (!capacity.isDeveloper && capacity.planKey !== null) {
      const userCount =
        (await this.prisma.user
          .count({ where: { tenantId } })
          .catch(() => 0)) ?? 0;
      if (userCount >= capacity.maxUsers) {
        throw new BadRequestException(
          `Batas kuota pengguna (${capacity.maxUsers} user) untuk paket ${capacity.planName} telah tercapai. Silakan tingkatkan paket Anda.`,
        );
      }
    }

    const defaultPassword = data.password || 'Staff@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const newUser = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role || 'administrator',
        tenantId: tenant.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        createdAt: true,
      },
    });

    // Simpan menu spesifik untuk user ini di metadata tenant.
    // JADIKAN SINGLE SOURCE OF TRUTH: selalu tulis userMenus[userId],
    // gunakan allowedMenus jika diberikan, jika tidak fallback ke enabledMenus tenant.
    const existingMeta = (tenant.metadata as any) || {};
    const userMenus = existingMeta.userMenus || {};
    userMenus[newUser.id] = Array.isArray(data.allowedMenus)
      ? data.allowedMenus
      : existingMeta.enabledMenus || [];

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        metadata: {
          ...existingMeta,
          userMenus,
        },
      },
    });

    return newUser;
  }

  // Superadmin: Detail klien lengkap beserta daftar user & statistik
  async getClientDetail(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        whatsappInstances: true,
        _count: {
          select: {
            products: true,
            knowledgeBases: true,
            resourceGroups: true,
          },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const meta = (tenant.metadata as any) || {};
    const userMenus = meta.userMenus || {};

    const usersWithMenus = tenant.users.map((u) => ({
      ...u,
      allowedMenus: userMenus[u.id] || meta.enabledMenus || [],
    }));

    const quota = await this.getTenantQuota(tenantId, tenant);

    return {
      ...tenant,
      users: usersWithMenus,
      quota,
    };
  }

  // Superadmin: Hapus perusahaan klien beserta relasinya
  async deleteClient(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.tenant.delete({
      where: { id: tenantId },
    });
  }

  // Superadmin / Manager: Update data akun pengguna/staf klien
  async updateTenantStaff(
    tenantId: string,
    userId: string,
    data: {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      isActive?: boolean;
      allowedMenus?: string[];
    },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user)
      throw new NotFoundException('User tidak ditemukan pada tenant ini');

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (typeof data.isActive === 'boolean') updateData.isActive = data.isActive;
    if (data.password && data.password.trim()) {
      const bcrypt = await import('bcrypt');
      updateData.password = await bcrypt.hash(data.password.trim(), 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        tenantId: true,
        updatedAt: true,
      },
    });

    if (Array.isArray(data.allowedMenus)) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      if (tenant) {
        const existingMeta = (tenant.metadata as any) || {};
        const userMenus = existingMeta.userMenus || {};
        userMenus[userId] = data.allowedMenus;
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: {
            metadata: {
              ...existingMeta,
              userMenus,
            },
          },
        });
      }
    }

    return updatedUser;
  }

  // Superadmin / Manager: Hapus akun pengguna/staf klien
  async deleteTenantStaff(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user)
      throw new NotFoundException('User tidak ditemukan pada tenant ini');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (tenant) {
      const existingMeta = (tenant.metadata as any) || {};
      if (existingMeta.userMenus && existingMeta.userMenus[userId]) {
        delete existingMeta.userMenus[userId];
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: { metadata: existingMeta },
        });
      }
    }

    return this.prisma.user.delete({
      where: { id: userId },
    });
  }
}
