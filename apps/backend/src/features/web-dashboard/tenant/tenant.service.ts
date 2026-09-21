import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { DataAgentService } from '../../knowledge-ingest/data-agent.service';

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataAgentService: DataAgentService,
  ) {}

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
            where: { role: { in: ['manager', 'owner', 'ADMIN', 'administrator'] } },
          });
          if (firstOwner) userId = firstOwner.id;
        }
      }

      if (!tenant) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { tenant: true },
        });

        if (!user || !user.tenantId) {
          throw new NotFoundException('User tidak terhubung dengan tenant manapun');
        }

        tenant = user.tenant;
        tenantId = user.tenantId;
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
        const firstOwner = await this.prisma.user.findFirst({
          where: { role: { in: ['manager', 'owner', 'ADMIN'] } },
        });
        if (firstOwner) userId = firstOwner.id;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { tenant: true },
      });
      if (user && user.tenantId) {
        resolvedTenantId = user.tenantId;
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
    return this.prisma.tenant.findMany({
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
        _count: {
          select: {
            products: true,
            knowledgeBases: true,
            whatsappInstances: true,
          },
        },
      },
    });
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
    const bcrypt = await import('bcrypt');
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

    const bcrypt = await import('bcrypt');
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

    return {
      ...tenant,
      users: usersWithMenus,
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
