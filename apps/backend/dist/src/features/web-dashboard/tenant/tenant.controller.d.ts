import { TenantService } from './tenant.service';
import { OnboardingDto } from './dto/onboarding.dto';
export declare class TenantController {
    private readonly tenantService;
    constructor(tenantService: TenantService);
    getDashboard(userId: string): Promise<{
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
    updateSettings(userId: string, body: {
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
    getProducts(userId: string): Promise<{
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
    addProduct(userId: string, body: {
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
    updateProduct(userId: string, productId: string, body: Partial<{
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
    deleteProduct(userId: string, productId: string): Promise<{
        success: boolean;
    }>;
    getKnowledge(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        content: string;
    }[]>;
    addKnowledge(userId: string, body: {
        content: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        content: string;
    }>;
    updateKnowledge(userId: string, knowledgeId: string, body: {
        content: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        content: string;
    }>;
    deleteKnowledge(userId: string, knowledgeId: string): Promise<{
        success: boolean;
    }>;
    getSales(userId: string): Promise<({
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
}
