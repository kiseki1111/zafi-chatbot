import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { DataAgentService } from '../../knowledge-ingest/data-agent.service';

@Injectable()
export class TenantService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly dataAgentService: DataAgentService
    ) {}

    async getDashboardOverview(userId: string) {
        // Mock fallback for frontend testing
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId }});
            if (owner) userId = owner.id;
        } else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' }});
            if (firstOwner) userId = firstOwner.id;
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { tenant: true }
        });

        if (!user || !user.tenantId) {
            throw new NotFoundException('User tidak terhubung dengan tenant manapun');
        }

        const tenantId = user.tenantId;

        // Ambil data untuk dashboard UMKM
        const productsCount = await this.prisma.product.count({ where: { tenantId } });
        const lowStockCount = await this.prisma.product.count({ where: { tenantId, stock: { lt: 5 } } });
        
        const knowledgeCount = await this.prisma.knowledgeBase.count({ where: { tenantId } });
        
        // Ambil penjualan hari ini (sederhana)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const salesRecords = await this.prisma.salesRecord.findMany({
            where: { 
                tenantId,
                soldAt: { gte: today }
            }
        });
        
        const omsetHariIni = salesRecords.reduce((total, record) => total + Number(record.totalPrice), 0);

        // Chat metrics — query through instanceName since Message/Conversation don't have tenantId
        const instances = await this.prisma.whatsappInstance.findMany({
            where: { tenantId },
            select: { instanceName: true }
        });
        const instanceNames = instances.map(i => i.instanceName);
        const instanceFilter = instanceNames.length > 0 ? { conversation: { instanceName: { in: instanceNames } } } : {};
        const instanceFilterConv = instanceNames.length > 0 ? { instanceName: { in: instanceNames } } : {};

        const totalMessages = await this.prisma.message.count({ where: instanceFilter });
        const botMessages = await this.prisma.message.count({ where: { ...instanceFilter, senderType: 'bot' } });
        const totalChats = await this.prisma.conversation.count({ where: instanceFilterConv });

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
                where: { tenantId, soldAt: { gte: d, lt: nextDay } }
            });
            const dayTotal = daySales.reduce((sum, r) => sum + Number(r.totalPrice), 0);
            revenueTrend.push({ label: dayNames[d.getDay()], value: dayTotal });
        }

        // Basic Insight
        const topProduct = await this.prisma.product.findFirst({
            where: { tenantId },
            orderBy: { stock: 'asc' }
        });

        return {
            tenant: user.tenant,
            metrics: {
                productsCount,
                lowStockCount,
                knowledgeCount,
                omsetHariIni,
                salesCountToday: salesRecords.length,
                totalChats,
                totalMessages,
                botMessages,
                botSuccessRate: totalMessages > 0 ? Math.round((botMessages / totalMessages) * 100) : 0,
            },
            revenueTrend,
            insights: {
                topProduct: topProduct?.name || '-',
                topProductStock: topProduct?.stock || 0
            }
        };
    }

    async updateTenantSettings(userId: string, data: { agentName?: string; agentTone?: string; phone?: string; greetingMsg?: string; ownerChatId?: string; systemPrompt?: string; operatingHours?: string; address?: string }) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId }});
            if (owner) userId = owner.id;
        } else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' }});
            if (firstOwner) userId = firstOwner.id;
        }
        
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.tenantId) throw new NotFoundException('Tenant not found');

        return this.prisma.tenant.update({
            where: { id: user.tenantId },
            data: data
        });
    }

    async getAgentReport(userId: string) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId }});
            if (userId) userId = owner?.id || userId;
        } else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' }});
            if (firstOwner) userId = firstOwner.id;
        }
        
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.tenantId) throw new NotFoundException('Tenant not found');
        const tenantId = user.tenantId;

        // KPI — real data, query through instanceName
        const instances = await this.prisma.whatsappInstance.findMany({
            where: { tenantId },
            select: { instanceName: true }
        });
        const instanceNames = instances.map(i => i.instanceName);
        const instanceFilter = instanceNames.length > 0 ? { conversation: { instanceName: { in: instanceNames } } } : {};
        const instanceFilterConv = instanceNames.length > 0 ? { instanceName: { in: instanceNames } } : {};

        const pesanMasuk = await this.prisma.message.count({ where: { ...instanceFilter, senderType: { not: 'bot' } } });
        const dibalasBot = await this.prisma.message.count({ where: { ...instanceFilter, senderType: 'bot' } });
        const pesananViaBot = await this.prisma.salesRecord.count({ where: { tenantId, source: 'BOT_CS' } });
        const pelangganBaru = await this.prisma.contact.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } });

        // 5 Pesanan Terakhir
        const recentSales = await this.prisma.salesRecord.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: 5
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
                where: { ...instanceFilter, createdAt: { gte: d, lt: nextDay } }
            });
            trenPesan.push({ label: dayNames[d.getDay()], masuk: count });
        }

        return {
            kpi: {
                pesanMasuk,
                dibalasBot,
                pesananViaBot,
                pelangganBaru
            },
            pesananTerakhir: recentSales.map(r => ({
                id: r.id,
                waktu: new Date(r.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                pelanggan: r.customerName || 'Unknown',
                produk: (r.attributes as any)?.items || 'Item',
                qty: r.quantity,
                total: Number(r.totalPrice)
            })),
            trenPesan
        };
    }

    async getTenantProducts(userId: string) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId }});
            if (owner) userId = owner.id;
        } else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' }});
            if (firstOwner) userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId) throw new NotFoundException('Tenant not found');
        return this.prisma.product.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' } });
    }

    async addTenantProduct(userId: string, data: { name: string; category: string; price: number; stock: number; description?: string; attributes?: any }) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId }});
            if (owner) userId = owner.id;
        } else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' }});
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
                attributes: data.attributes || {}
            }
        });

        // Trigger sync ke vector db agar agent mengenali produk baru
        await this.dataAgentService.syncKnowledgeBase(user.tenantId);

        return product;
    }

    async updateTenantProduct(userId: string, productId: string, data: Partial<{ name: string; category: string; price: number; stock: number; description: string; attributes: any }>) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId }});
            if (owner) userId = owner.id;
        } else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' }});
            if (firstOwner) userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId) throw new NotFoundException('Tenant not found');

        const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId } });
        if (!product) throw new NotFoundException('Product not found');

        const updated = await this.prisma.product.update({
            where: { id: productId },
            data
        });

        await this.dataAgentService.syncKnowledgeBase(user.tenantId);
        return updated;
    }

    async deleteTenantProduct(userId: string, productId: string) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId }});
            if (owner) userId = owner.id;
        } else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' }});
            if (firstOwner) userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId) throw new NotFoundException('Tenant not found');

        const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId } });
        if (!product) throw new NotFoundException('Product not found');

        await this.prisma.product.delete({ where: { id: productId } });
        
        await this.dataAgentService.syncKnowledgeBase(user.tenantId);
        return { success: true };
    }

    async getTenantKnowledge(userId: string) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId }});
            if (owner) userId = owner.id;
        } else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' }});
            if (firstOwner) userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId) throw new NotFoundException('Tenant not found');
        return this.prisma.knowledgeBase.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' } });
    }

    async addTenantKnowledge(userId: string, content: string) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId }});
            if (owner) userId = owner.id;
        } else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' }});
            if (firstOwner) userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId) throw new NotFoundException('Tenant not found');

        const kb = await this.prisma.knowledgeBase.create({
            data: {
                tenantId: user.tenantId,
                content: content,
                metadata: { source: 'MANUAL_INPUT' }
            }
        });

        // Trigger sync ke vector db agar agent langsung mengingat fakta baru ini
        await this.dataAgentService.syncKnowledgeBase(user.tenantId);

        return kb;
    }

    async updateTenantKnowledge(userId: string, knowledgeId: string, content: string) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId }});
            if (owner) userId = owner.id;
        } else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' }});
            if (firstOwner) userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId) throw new NotFoundException('Tenant not found');

        const kb = await this.prisma.knowledgeBase.findFirst({ where: { id: knowledgeId, tenantId: user.tenantId } });
        if (!kb) throw new NotFoundException('Knowledge not found');

        const updated = await this.prisma.knowledgeBase.update({
            where: { id: knowledgeId },
            data: { content }
        });

        await this.dataAgentService.syncKnowledgeBase(user.tenantId);
        return updated;
    }

    async deleteTenantKnowledge(userId: string, knowledgeId: string) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId }});
            if (owner) userId = owner.id;
        } else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' }});
            if (firstOwner) userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId) throw new NotFoundException('Tenant not found');

        const kb = await this.prisma.knowledgeBase.findFirst({ where: { id: knowledgeId, tenantId: user.tenantId } });
        if (!kb) throw new NotFoundException('Knowledge not found');

        await this.prisma.knowledgeBase.delete({ where: { id: knowledgeId } });

        await this.dataAgentService.syncKnowledgeBase(user.tenantId);
        return { success: true };
    }

    async getTenantSales(userId: string) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId }});
            if (owner) userId = owner.id;
        } else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' }});
            if (firstOwner) userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId) throw new NotFoundException('Tenant not found');
        return this.prisma.salesRecord.findMany({ 
            where: { tenantId: user.tenantId }, 
            orderBy: { soldAt: 'desc' },
            include: { product: true }
        });
    }

    async completeOnboarding(userId: string, dto: OnboardingDto) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId }});
            if (owner) userId = owner.id;
        } else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' }});
            if (firstOwner) userId = firstOwner.id;
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.tenantId) throw new NotFoundException('Tenant not found');

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
                metadata: { botToken: dto.botToken || '' }
            }
        });

        // Trigger sync ke vector db agar agen mengetahui info toko yang baru disubmit
        await this.dataAgentService.syncKnowledgeBase(user.tenantId);

        return tenant;
    }
}
