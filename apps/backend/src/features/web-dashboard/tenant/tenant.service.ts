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

        // Chat metrics
        const totalChats = await this.prisma.message.count({ where: { status: 'SENT' } });

        // Revenue trend (last 7 days - simple dummy approach but structure is ready)
        const revenueTrend = [
            { label: "Sen", value: 0 },
            { label: "Sel", value: 1200000 },
            { label: "Rab", value: 0 },
            { label: "Kam", value: omsetHariIni },
            { label: "Jum", value: 0 },
            { label: "Sab", value: 0 },
            { label: "Min", value: 0 },
        ];

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
                botSuccessRate: 94 // Dummy logic
            },
            revenueTrend,
            insights: {
                topProduct: topProduct?.name || 'Produk A',
                topProductStock: topProduct?.stock || 0
            }
        };
    }

    async updateTenantSettings(userId: string, data: { agentName?: string; agentTone?: string; phone?: string; greetingMsg?: string; ownerChatId?: string }) {
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

        // KPI
        const pesanMasuk = 15; // Placeholder
        const dibalasBot = 14; // Placeholder
        const pesananViaBot = await this.prisma.salesRecord.count({ where: { tenantId, source: 'BOT_CS' } });
        const pelangganBaru = 5; // Placeholder

        // 5 Pesanan Terakhir
        const recentSales = await this.prisma.salesRecord.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        // Tren 7 hari (simplified dummy-like for now, but real structure)
        const trenPesan = [
            { label: "Sen", masuk: 10 },
            { label: "Sel", masuk: 20 },
            { label: "Rab", masuk: 15 },
            { label: "Kam", masuk: pesanMasuk },
            { label: "Jum", masuk: 0 },
            { label: "Sab", masuk: 0 },
            { label: "Min", masuk: 0 },
        ];

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
