import { Controller, Get, Put, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { OnboardingDto } from './dto/onboarding.dto';
// Jika ada JwtGuard, import di sini. Untuk sementara kita allow tanpa auth atau gunakan mock guard jika MVP
// import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard'; 

@Controller('api/v1/tenant')
export class TenantController {
    constructor(private readonly tenantService: TenantService) {}

    // Dummy mock endpoint jika belum implementasi auth JWT full di frontend
    // Frontend cukup panggil GET /api/v1/tenant/:userId/dashboard
    @Get(':userId/dashboard')
    async getDashboard(@Param('userId') userId: string) {
        return this.tenantService.getDashboardOverview(userId);
    }

    @Patch(':userId/settings')
    async updateSettings(
        @Param('userId') userId: string,
        @Body() body: { agentName?: string; agentTone?: string; phone?: string; greetingMsg?: string; ownerChatId?: string; systemPrompt?: string; operatingHours?: string; address?: string }
    ) {
        return this.tenantService.updateTenantSettings(userId, body);
    }

    @Get(':userId/report')
    async getAgentReport(@Param('userId') userId: string) {
        return this.tenantService.getAgentReport(userId);
    }

    @Put(':userId/onboarding')
    async completeOnboarding(
        @Param('userId') userId: string,
        @Body() dto: OnboardingDto
    ) {
        return this.tenantService.completeOnboarding(userId, dto);
    }

    @Get(':userId/products')
    async getProducts(@Param('userId') userId: string) {
        return this.tenantService.getTenantProducts(userId);
    }

    @Post(':userId/products')
    async addProduct(
        @Param('userId') userId: string,
        @Body() body: { name: string; category: string; price: number; stock: number; description?: string; attributes?: any }
    ) {
        return this.tenantService.addTenantProduct(userId, body);
    }

    @Patch(':userId/products/:productId')
    async updateProduct(
        @Param('userId') userId: string,
        @Param('productId') productId: string,
        @Body() body: Partial<{ name: string; category: string; price: number; stock: number; description: string; attributes: any }>
    ) {
        return this.tenantService.updateTenantProduct(userId, productId, body);
    }

    @Delete(':userId/products/:productId')
    async deleteProduct(
        @Param('userId') userId: string,
        @Param('productId') productId: string
    ) {
        return this.tenantService.deleteTenantProduct(userId, productId);
    }

    @Get(':userId/knowledge')
    async getKnowledge(@Param('userId') userId: string) {
        return this.tenantService.getTenantKnowledge(userId);
    }

    @Post(':userId/knowledge')
    async addKnowledge(
        @Param('userId') userId: string,
        @Body() body: { content: string }
    ) {
        return this.tenantService.addTenantKnowledge(userId, body.content);
    }

    @Patch(':userId/knowledge/:knowledgeId')
    async updateKnowledge(
        @Param('userId') userId: string,
        @Param('knowledgeId') knowledgeId: string,
        @Body() body: { content: string }
    ) {
        return this.tenantService.updateTenantKnowledge(userId, knowledgeId, body.content);
    }

    @Delete(':userId/knowledge/:knowledgeId')
    async deleteKnowledge(
        @Param('userId') userId: string,
        @Param('knowledgeId') knowledgeId: string
    ) {
        return this.tenantService.deleteTenantKnowledge(userId, knowledgeId);
    }

    @Get(':userId/sales')
    async getSales(@Param('userId') userId: string) {
        return this.tenantService.getTenantSales(userId);
    }
}
