import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  private resolveTenantUserId(requestedId: string, req: any): string {
    const user = req?.user;
    const isSuperadmin = user?.roles?.includes('superadmin');
    if (isSuperadmin) {
      return requestedId;
    }
    // Strict Tenant Isolation: Non-superadmin is strictly bounded to their own tenant or user ID
    if (
      user?.tenantId &&
      requestedId !== user.tenantId &&
      requestedId !== user.sub
    ) {
      throw new ForbiddenException(
        'Akses ditolak: Anda tidak memiliki izin mengakses data tenant lain.',
      );
    }
    return user?.tenantId || user?.sub || requestedId;
  }

  private ensureSuperadmin(req: any) {
    if (!req?.user?.roles?.includes('superadmin')) {
      throw new ForbiddenException(
        'Akses ditolak: Hanya Superadmin yang berhak mengakses fungsi ini.',
      );
    }
  }

  private ensureTenantAccess(tenantId: string, req: any) {
    const isSuper = req?.user?.roles?.includes('superadmin');
    if (!isSuper && req?.user?.tenantId !== tenantId) {
      throw new ForbiddenException(
        'Akses ditolak: Anda tidak berhak mengelola data tenant lain.',
      );
    }
  }

  @Get(':userId/dashboard')
  async getDashboard(@Param('userId') userId: string, @Req() req: any) {
    const targetId = this.resolveTenantUserId(userId, req);
    return this.tenantService.getDashboardOverview(targetId);
  }

  @Patch(':userId/settings')
  async updateSettings(
    @Param('userId') userId: string,
    @Req() req: any,
    @Body()
    body: {
      agentName?: string;
      agentTone?: string;
      phone?: string;
      greetingMsg?: string;
      ownerChatId?: string;
      systemPrompt?: string;
      operatingHours?: string;
      address?: string;
    },
  ) {
    const targetId = this.resolveTenantUserId(userId, req);
    return this.tenantService.updateTenantSettings(targetId, body);
  }

  @Get(':userId/report')
  async getAgentReport(@Param('userId') userId: string, @Req() req: any) {
    const targetId = this.resolveTenantUserId(userId, req);
    return this.tenantService.getAgentReport(targetId);
  }

  @Put(':userId/onboarding')
  async completeOnboarding(
    @Param('userId') userId: string,
    @Req() req: any,
    @Body() dto: OnboardingDto,
  ) {
    const targetId = this.resolveTenantUserId(userId, req);
    return this.tenantService.completeOnboarding(targetId, dto);
  }

  @Get(':userId/products')
  async getProducts(@Param('userId') userId: string, @Req() req: any) {
    const targetId = this.resolveTenantUserId(userId, req);
    return this.tenantService.getTenantProducts(targetId);
  }

  @Post(':userId/products')
  async addProduct(
    @Param('userId') userId: string,
    @Req() req: any,
    @Body()
    body: {
      name: string;
      category: string;
      price: number;
      stock: number;
      description?: string;
      attributes?: any;
    },
  ) {
    const targetId = this.resolveTenantUserId(userId, req);
    return this.tenantService.addTenantProduct(targetId, body);
  }

  @Patch(':userId/products/:productId')
  async updateProduct(
    @Param('userId') userId: string,
    @Param('productId') productId: string,
    @Req() req: any,
    @Body()
    body: Partial<{
      name: string;
      category: string;
      price: number;
      stock: number;
      description: string;
      attributes: any;
    }>,
  ) {
    const targetId = this.resolveTenantUserId(userId, req);
    return this.tenantService.updateTenantProduct(targetId, productId, body);
  }

  @Delete(':userId/products/:productId')
  async deleteProduct(
    @Param('userId') userId: string,
    @Param('productId') productId: string,
    @Req() req: any,
  ) {
    const targetId = this.resolveTenantUserId(userId, req);
    return this.tenantService.deleteTenantProduct(targetId, productId);
  }

  @Get(':userId/knowledge')
  async getKnowledge(@Param('userId') userId: string, @Req() req: any) {
    const targetId = this.resolveTenantUserId(userId, req);
    return this.tenantService.getTenantKnowledge(targetId);
  }

  @Post(':userId/knowledge')
  async addKnowledge(
    @Param('userId') userId: string,
    @Req() req: any,
    @Body() body: { content: string },
  ) {
    const targetId = this.resolveTenantUserId(userId, req);
    return this.tenantService.addTenantKnowledge(targetId, body.content);
  }

  @Patch(':userId/knowledge/:knowledgeId')
  async updateKnowledge(
    @Param('userId') userId: string,
    @Param('knowledgeId') knowledgeId: string,
    @Req() req: any,
    @Body() body: { content: string },
  ) {
    const targetId = this.resolveTenantUserId(userId, req);
    return this.tenantService.updateTenantKnowledge(
      targetId,
      knowledgeId,
      body.content,
    );
  }

  @Delete(':userId/knowledge/:knowledgeId')
  async deleteKnowledge(
    @Param('userId') userId: string,
    @Param('knowledgeId') knowledgeId: string,
    @Req() req: any,
  ) {
    const targetId = this.resolveTenantUserId(userId, req);
    return this.tenantService.deleteTenantKnowledge(targetId, knowledgeId);
  }

  @Get(':userId/sales')
  async getSales(@Param('userId') userId: string, @Req() req: any) {
    const targetId = this.resolveTenantUserId(userId, req);
    return this.tenantService.getTenantSales(targetId);
  }

  // Superadmin: Daftar semua klien B2B
  @Get('clients/all')
  async listClients(@Req() req: any) {
    this.ensureSuperadmin(req);
    return this.tenantService.listAllClients();
  }

  // Superadmin: Buat klien tenant baru beserta akun manager & centang menu
  @Post('clients')
  async createClient(
    @Req() req: any,
    @Body()
    body: {
      companyName: string;
      category?: string;
      managerName: string;
      managerEmail: string;
      managerPassword?: string;
      enabledMenus: string[];
    },
  ) {
    this.ensureSuperadmin(req);
    return this.tenantService.createClient(body);
  }

  // Superadmin / Client: Ambil kuota MAU & AI response
  @Get('clients/:tenantId/quota')
  async getTenantQuota(@Param('tenantId') tenantId: string, @Req() req: any) {
    this.ensureTenantAccess(tenantId, req);
    return this.tenantService.getTenantQuota(tenantId);
  }

  // Superadmin: Update kuota paket (MAU & AI responses)
  @Patch('clients/:tenantId/quota')
  async updateTenantQuota(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
    @Body()
    body: {
      plan?: string;
      maxMau?: number;
      maxAiResponses?: number;
      planPrice?: number;
    },
  ) {
    this.ensureSuperadmin(req);
    return this.tenantService.updateTenantQuota(tenantId, body);
  }

  // Superadmin: Update hak akses menu untuk klien tertentu
  @Patch('clients/:tenantId/menus')
  async updateClientMenus(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
    @Body() body: { enabledMenus: string[]; category?: string },
  ) {
    this.ensureSuperadmin(req);
    return this.tenantService.updateClientMenus(
      tenantId,
      body.enabledMenus,
      body.category,
    );
  }

  // Superadmin: Update detail & konfigurasi lengkap tenant
  @Patch('clients/:tenantId/detail')
  async updateTenantDetail(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    this.ensureSuperadmin(req);
    return this.tenantService.updateTenantDetail(tenantId, body);
  }

  // Superadmin / Manager: Buat akun staf/administrator tambahan untuk tenant
  @Post('clients/:tenantId/users')
  async createTenantStaff(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
    @Body()
    body: {
      name: string;
      email: string;
      password?: string;
      role?: string;
      allowedMenus?: string[];
    },
  ) {
    this.ensureTenantAccess(tenantId, req);
    return this.tenantService.createTenantStaff(tenantId, body);
  }

  // Superadmin: Detail klien lengkap beserta daftar user & statistik
  @Get('clients/:tenantId')
  async getClientDetail(@Param('tenantId') tenantId: string, @Req() req: any) {
    this.ensureTenantAccess(tenantId, req);
    return this.tenantService.getClientDetail(tenantId);
  }

  // Superadmin: Hapus perusahaan klien
  @Delete('clients/:tenantId')
  async deleteClient(@Param('tenantId') tenantId: string, @Req() req: any) {
    this.ensureSuperadmin(req);
    return this.tenantService.deleteClient(tenantId);
  }

  // Superadmin / Manager: Update data akun pengguna/staf klien
  @Patch('clients/:tenantId/users/:userId')
  async updateTenantStaff(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Req() req: any,
    @Body()
    body: {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      isActive?: boolean;
      allowedMenus?: string[];
    },
  ) {
    this.ensureTenantAccess(tenantId, req);
    return this.tenantService.updateTenantStaff(tenantId, userId, body);
  }

  // Superadmin / Manager: Hapus akun pengguna/staf klien
  @Delete('clients/:tenantId/users/:userId')
  async deleteTenantStaff(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    this.ensureTenantAccess(tenantId, req);
    return this.tenantService.deleteTenantStaff(tenantId, userId);
  }
}
