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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { TenantService } from './tenant.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  private resolveTenantUserId(requestedId: string, req: any): string {
    const user = req?.user;
    const isSuperadmin =
      user?.roles?.some((r: string) => r?.toLowerCase() === 'superadmin') ||
      user?.role?.toLowerCase() === 'superadmin';
    if (isSuperadmin) {
      return requestedId;
    }
    if (!user?.tenantId) {
      throw new ForbiddenException(
        'Akses ditolak: Akun Anda tidak terhubung ke tenant manapun.',
      );
    }
    // Strict Tenant Isolation: Non-superadmin is strictly bounded to their own tenant
    if (requestedId !== user.tenantId && requestedId !== user.sub) {
      throw new ForbiddenException(
        'Akses ditolak: Anda tidak memiliki izin mengakses data tenant lain.',
      );
    }
    return user.tenantId;
  }

  private ensureSuperadmin(req: any) {
    const user = req?.user;
    const isSuper =
      user?.roles?.some((r: string) => r?.toLowerCase() === 'superadmin') ||
      user?.role?.toLowerCase() === 'superadmin';
    if (!isSuper) {
      throw new ForbiddenException(
        'Akses ditolak: Hanya Superadmin yang berhak mengakses fungsi ini.',
      );
    }
  }

  private ensureTenantAccess(tenantId: string, req: any) {
    const user = req?.user;
    const isSuper =
      user?.roles?.some((r: string) => r?.toLowerCase() === 'superadmin') ||
      user?.role?.toLowerCase() === 'superadmin';
    if (!isSuper && user?.tenantId !== tenantId) {
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

  @Patch(':userId/checklist/dismiss')
  async dismissChecklist(@Param('userId') userId: string, @Req() req: any) {
    const targetId = this.resolveTenantUserId(userId, req);
    return this.tenantService.dismissChecklist(targetId);
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
      colorPalette?: { primary?: string; secondary?: string; accent?: string };
      productGallery?: any[];
    },
  ) {
    const targetId = this.resolveTenantUserId(userId, req);
    return this.tenantService.updateTenantSettings(targetId, body);
  }

  @Get(':userId/effective-prompt')
  async getEffectivePrompt(@Param('userId') userId: string, @Req() req: any) {
    const targetId = this.resolveTenantUserId(userId, req);
    return { prompt: await this.tenantService.getEffectivePrompt(targetId) };
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
      imageUrl: string;
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

  // ponytail: endpoint upload media khusus produk — terisolasi dari availability/siteplan
  @Post(':userId/products/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname).toLowerCase();
          const cleanName = file.originalname
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9]/g, '_');
          const isVideo =
            file.mimetype.startsWith('video/') ||
            /\.(mov|mp4|mkv|avi|webm)$/i.test(file.originalname);
          const finalExt = isVideo ? '.mp4' : ext;
          cb(null, `${uniqueSuffix}-${cleanName}${finalExt}`);
        },
      }),
      limits: {
        fileSize: 300 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase().replace('.', '');
        const allowed = ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'mkv', 'avi', 'webm'];
        if (allowed.includes(ext)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Format file tidak didukung. Hanya gambar dan video yang diizinkan.',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadProductMedia(
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan');
    }
    const targetId = this.resolveTenantUserId(userId, req);
    const isVideo =
      file.mimetype.startsWith('video/') ||
      /\.(mov|mp4|mkv|avi|webm)$/i.test(file.originalname);

    await this.tenantService.verifyProductMediaUpload(targetId, isVideo);

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const baseUrl = process.env.PUBLIC_URL || `${protocol}://${host}`;
    const relativeUrl = `/uploads/${file.filename}`;

    return {
      url: relativeUrl,
      fullUrl: `${baseUrl}${relativeUrl}`,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: isVideo ? 'video/mp4' : file.mimetype,
      size: file.size,
      mediaType: isVideo ? 'video' : 'image',
      canPlayNative: isVideo ? file.size <= 16 * 1024 * 1024 : true,
    };
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
      plan?: string | null;
      planName?: string | null;
      maxMau?: number;
      maxAiResponses?: number;
      planPrice?: number;
    },
  ) {
    this.ensureSuperadmin(req);
    return this.tenantService.updateTenantQuota(tenantId, body);
  }

  // Katalog Top-Up & Add-On
  @Get('topup/catalog')
  getTopUpCatalog() {
    return this.tenantService.getTopUpCatalog();
  }

  // Superadmin: Terapkan Top-Up / Add-on ke Klien
  @Post('clients/:tenantId/topup')
  async applyTenantTopUp(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
    @Body()
    body: {
      itemKey: string;
      mau?: number;
      ai?: number;
      whatsapp?: number;
      users?: number;
      projects?: number;
      notes?: string;
    },
  ) {
    this.ensureSuperadmin(req);
    return this.tenantService.applyTenantTopUp(tenantId, body);
  }

  // Tenant / Superadmin: Update Pengaturan Auto Top-Up Booster S
  @Patch('clients/:tenantId/auto-topup')
  async updateAutoTopUpSettings(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
    @Body() body: { autoTopUpEnabled: boolean; autoTopUpMonthlyLimit?: number },
  ) {
    this.ensureTenantAccess(tenantId, req);
    return this.tenantService.updateAutoTopUpSettings(tenantId, body);
  }

  // Tenant / Superadmin: Evaluasi & Pemicu Notifikasi Kuota WhatsApp (80% & 100%)
  @Post('clients/:tenantId/notify-quota')
  async triggerQuotaNotification(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
  ) {
    this.ensureTenantAccess(tenantId, req);
    return this.tenantService.checkAndNotifyQuota(tenantId);
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
