import { PrismaService } from "../../../core/prisma/prisma.service";
import { OnboardingDto } from './dto/onboarding.dto';
import { DataAgentService } from '../../knowledge-ingest/data-agent.service';
export declare class TenantService {
    private readonly prisma;
    private readonly dataAgentService;
    constructor(prisma: PrismaService, dataAgentService: DataAgentService);
    getDashboardOverview(userId: string): Promise<{
        tenant: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string | null;
            category: string | null;
            description: string | null;
            address: string | null;
            operatingHours: string | null;
            socialLinks: import("@prisma/client/runtime/library").JsonValue | null;
            paymentMethods: string | null;
            shippingMethods: string | null;
            returnPolicy: string | null;
            currentPromo: string | null;
            extraInfo: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            agentName: string;
            agentTone: string;
            greetingMsg: string | null;
            ownerChatId: string | null;
            closingTime: string;
            isOnboarded: boolean;
        } | null;
        metrics: {
            productsCount: number;
            lowStockCount: number;
            knowledgeCount: number;
            omsetHariIni: number;
            salesCountToday: number;
            totalChats: number;
            botSuccessRate: number;
        };
        revenueTrend: {
            label: string;
            value: number;
        }[];
        insights: {
            topProduct: string;
            topProductStock: number;
        };
    }>;
    updateTenantSettings(userId: string, data: {
        agentName?: string;
        agentTone?: string;
        phone?: string;
        greetingMsg?: string;
        ownerChatId?: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        category: string | null;
        description: string | null;
        address: string | null;
        operatingHours: string | null;
        socialLinks: import("@prisma/client/runtime/library").JsonValue | null;
        paymentMethods: string | null;
        shippingMethods: string | null;
        returnPolicy: string | null;
        currentPromo: string | null;
        extraInfo: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        agentName: string;
        agentTone: string;
        greetingMsg: string | null;
        ownerChatId: string | null;
        closingTime: string;
        isOnboarded: boolean;
    }>;
    getAgentReport(userId: string): Promise<{
        kpi: {
            pesanMasuk: number;
            dibalasBot: number;
            pesananViaBot: number;
            pelangganBaru: number;
        };
        pesananTerakhir: {
            id: string;
            waktu: string;
            pelanggan: string;
            produk: any;
            qty: number;
            total: number;
        }[];
        trenPesan: {
            label: string;
            masuk: number;
        }[];
    }>;
    getTenantProducts(userId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        category: string;
        description: string;
        price: import("@prisma/client/runtime/library").Decimal;
        stock: number;
        imageUrl: string | null;
        attributes: import("@prisma/client/runtime/library").JsonValue | null;
        embeddingText: string | null;
    }[]>;
    addTenantProduct(userId: string, data: {
        name: string;
        category: string;
        price: number;
        stock: number;
        description?: string;
        attributes?: any;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        category: string;
        description: string;
        price: import("@prisma/client/runtime/library").Decimal;
        stock: number;
        imageUrl: string | null;
        attributes: import("@prisma/client/runtime/library").JsonValue | null;
        embeddingText: string | null;
    }>;
    updateTenantProduct(userId: string, productId: string, data: Partial<{
        name: string;
        category: string;
        price: number;
        stock: number;
        description: string;
        attributes: any;
    }>): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        category: string;
        description: string;
        price: import("@prisma/client/runtime/library").Decimal;
        stock: number;
        imageUrl: string | null;
        attributes: import("@prisma/client/runtime/library").JsonValue | null;
        embeddingText: string | null;
    }>;
    deleteTenantProduct(userId: string, productId: string): Promise<{
        success: boolean;
    }>;
    getTenantKnowledge(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        content: string;
    }[]>;
    addTenantKnowledge(userId: string, content: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        content: string;
    }>;
    updateTenantKnowledge(userId: string, knowledgeId: string, content: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        content: string;
    }>;
    deleteTenantKnowledge(userId: string, knowledgeId: string): Promise<{
        success: boolean;
    }>;
    getTenantSales(userId: string): Promise<({
        product: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string | null;
            category: string;
            description: string;
            price: import("@prisma/client/runtime/library").Decimal;
            stock: number;
            imageUrl: string | null;
            attributes: import("@prisma/client/runtime/library").JsonValue | null;
            embeddingText: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        tenantId: string;
        notes: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        attributes: import("@prisma/client/runtime/library").JsonValue | null;
        receiptNumber: string;
        productId: string | null;
        quantity: number;
        totalPrice: import("@prisma/client/runtime/library").Decimal;
        customerName: string | null;
        source: string;
        reportedBy: string | null;
        soldAt: Date;
    })[]>;
    completeOnboarding(userId: string, dto: OnboardingDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        category: string | null;
        description: string | null;
        address: string | null;
        operatingHours: string | null;
        socialLinks: import("@prisma/client/runtime/library").JsonValue | null;
        paymentMethods: string | null;
        shippingMethods: string | null;
        returnPolicy: string | null;
        currentPromo: string | null;
        extraInfo: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        agentName: string;
        agentTone: string;
        greetingMsg: string | null;
        ownerChatId: string | null;
        closingTime: string;
        isOnboarded: boolean;
    }>;
}
