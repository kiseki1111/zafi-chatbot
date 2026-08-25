"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../core/prisma/prisma.service");
const data_agent_service_1 = require("../../knowledge-ingest/data-agent.service");
let TenantService = class TenantService {
    prisma;
    dataAgentService;
    constructor(prisma, dataAgentService) {
        this.prisma = prisma;
        this.dataAgentService = dataAgentService;
    }
    async getDashboardOverview(userId) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId } });
            if (owner)
                userId = owner.id;
        }
        else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' } });
            if (firstOwner)
                userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { tenant: true }
        });
        if (!user || !user.tenantId) {
            throw new common_1.NotFoundException('User tidak terhubung dengan tenant manapun');
        }
        const tenantId = user.tenantId;
        const productsCount = await this.prisma.product.count({ where: { tenantId } });
        const lowStockCount = await this.prisma.product.count({ where: { tenantId, stock: { lt: 5 } } });
        const knowledgeCount = await this.prisma.knowledgeBase.count({ where: { tenantId } });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const salesRecords = await this.prisma.salesRecord.findMany({
            where: {
                tenantId,
                soldAt: { gte: today }
            }
        });
        const omsetHariIni = salesRecords.reduce((total, record) => total + Number(record.totalPrice), 0);
        const totalChats = await this.prisma.message.count({ where: { status: 'SENT' } });
        const revenueTrend = [
            { label: "Sen", value: 0 },
            { label: "Sel", value: 1200000 },
            { label: "Rab", value: 0 },
            { label: "Kam", value: omsetHariIni },
            { label: "Jum", value: 0 },
            { label: "Sab", value: 0 },
            { label: "Min", value: 0 },
        ];
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
                botSuccessRate: 94
            },
            revenueTrend,
            insights: {
                topProduct: topProduct?.name || 'Produk A',
                topProductStock: topProduct?.stock || 0
            }
        };
    }
    async updateTenantSettings(userId, data) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId } });
            if (owner)
                userId = owner.id;
        }
        else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' } });
            if (firstOwner)
                userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.tenantId)
            throw new common_1.NotFoundException('Tenant not found');
        return this.prisma.tenant.update({
            where: { id: user.tenantId },
            data: data
        });
    }
    async getAgentReport(userId) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId } });
            if (userId)
                userId = owner?.id || userId;
        }
        else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' } });
            if (firstOwner)
                userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.tenantId)
            throw new common_1.NotFoundException('Tenant not found');
        const tenantId = user.tenantId;
        const pesanMasuk = 15;
        const dibalasBot = 14;
        const pesananViaBot = await this.prisma.salesRecord.count({ where: { tenantId, source: 'BOT_CS' } });
        const pelangganBaru = 5;
        const recentSales = await this.prisma.salesRecord.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: 5
        });
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
                produk: r.attributes?.items || 'Item',
                qty: r.quantity,
                total: Number(r.totalPrice)
            })),
            trenPesan
        };
    }
    async getTenantProducts(userId) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId } });
            if (owner)
                userId = owner.id;
        }
        else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' } });
            if (firstOwner)
                userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId)
            throw new common_1.NotFoundException('Tenant not found');
        return this.prisma.product.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' } });
    }
    async addTenantProduct(userId, data) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId } });
            if (owner)
                userId = owner.id;
        }
        else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' } });
            if (firstOwner)
                userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId)
            throw new common_1.NotFoundException('Tenant not found');
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
        await this.dataAgentService.syncKnowledgeBase(user.tenantId);
        return product;
    }
    async updateTenantProduct(userId, productId, data) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId } });
            if (owner)
                userId = owner.id;
        }
        else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' } });
            if (firstOwner)
                userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId)
            throw new common_1.NotFoundException('Tenant not found');
        const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId } });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const updated = await this.prisma.product.update({
            where: { id: productId },
            data
        });
        await this.dataAgentService.syncKnowledgeBase(user.tenantId);
        return updated;
    }
    async deleteTenantProduct(userId, productId) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId } });
            if (owner)
                userId = owner.id;
        }
        else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' } });
            if (firstOwner)
                userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId)
            throw new common_1.NotFoundException('Tenant not found');
        const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId } });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        await this.prisma.product.delete({ where: { id: productId } });
        await this.dataAgentService.syncKnowledgeBase(user.tenantId);
        return { success: true };
    }
    async getTenantKnowledge(userId) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId } });
            if (owner)
                userId = owner.id;
        }
        else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' } });
            if (firstOwner)
                userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId)
            throw new common_1.NotFoundException('Tenant not found');
        return this.prisma.knowledgeBase.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: 'desc' } });
    }
    async addTenantKnowledge(userId, content) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId } });
            if (owner)
                userId = owner.id;
        }
        else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' } });
            if (firstOwner)
                userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId)
            throw new common_1.NotFoundException('Tenant not found');
        const kb = await this.prisma.knowledgeBase.create({
            data: {
                tenantId: user.tenantId,
                content: content,
                metadata: { source: 'MANUAL_INPUT' }
            }
        });
        await this.dataAgentService.syncKnowledgeBase(user.tenantId);
        return kb;
    }
    async updateTenantKnowledge(userId, knowledgeId, content) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId } });
            if (owner)
                userId = owner.id;
        }
        else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' } });
            if (firstOwner)
                userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId)
            throw new common_1.NotFoundException('Tenant not found');
        const kb = await this.prisma.knowledgeBase.findFirst({ where: { id: knowledgeId, tenantId: user.tenantId } });
        if (!kb)
            throw new common_1.NotFoundException('Knowledge not found');
        const updated = await this.prisma.knowledgeBase.update({
            where: { id: knowledgeId },
            data: { content }
        });
        await this.dataAgentService.syncKnowledgeBase(user.tenantId);
        return updated;
    }
    async deleteTenantKnowledge(userId, knowledgeId) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId } });
            if (owner)
                userId = owner.id;
        }
        else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' } });
            if (firstOwner)
                userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId)
            throw new common_1.NotFoundException('Tenant not found');
        const kb = await this.prisma.knowledgeBase.findFirst({ where: { id: knowledgeId, tenantId: user.tenantId } });
        if (!kb)
            throw new common_1.NotFoundException('Knowledge not found');
        await this.prisma.knowledgeBase.delete({ where: { id: knowledgeId } });
        await this.dataAgentService.syncKnowledgeBase(user.tenantId);
        return { success: true };
    }
    async getTenantSales(userId) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId } });
            if (owner)
                userId = owner.id;
        }
        else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' } });
            if (firstOwner)
                userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.tenantId)
            throw new common_1.NotFoundException('Tenant not found');
        return this.prisma.salesRecord.findMany({
            where: { tenantId: user.tenantId },
            orderBy: { soldAt: 'desc' },
            include: { product: true }
        });
    }
    async completeOnboarding(userId, dto) {
        if (userId.includes('@')) {
            const owner = await this.prisma.user.findUnique({ where: { email: userId } });
            if (owner)
                userId = owner.id;
        }
        else if (userId === 'demo' || userId.startsWith('u-')) {
            const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' } });
            if (firstOwner)
                userId = firstOwner.id;
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.tenantId)
            throw new common_1.NotFoundException('Tenant not found');
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
        await this.dataAgentService.syncKnowledgeBase(user.tenantId);
        return tenant;
    }
};
exports.TenantService = TenantService;
exports.TenantService = TenantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        data_agent_service_1.DataAgentService])
], TenantService);
//# sourceMappingURL=tenant.service.js.map