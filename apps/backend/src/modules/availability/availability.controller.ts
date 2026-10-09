import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
  ForbiddenException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AvailabilityService } from './availability.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const execAsync = promisify(exec);

@UseGuards(JwtAuthGuard)
@Controller('api/v1/availability')
export class AvailabilityController {
  private readonly logger = new Logger(AvailabilityController.name);

  constructor(private readonly availabilityService: AvailabilityService) {}

  private resolveTenantId(req: any): string | undefined {
    const isSuper = req?.user?.roles?.includes('superadmin');
    if (isSuper) return undefined;
    return req?.user?.tenantId;
  }

  @Post('upload')
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
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname).toLowerCase();
          const cleanName = file.originalname
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9]/g, '_');
          // Untuk video, pastikan berformat .mp4 agar kompatibel penuh di web & WhatsApp
          const isVideo =
            file.mimetype.startsWith('video/') ||
            /\.(mov|mp4|mkv|avi|webm)$/i.test(file.originalname);
          const finalExt = isVideo ? '.mp4' : ext;
          cb(null, `${uniqueSuffix}-${cleanName}${finalExt}`);
        },
      }),
      limits: {
        fileSize: 300 * 1024 * 1024, // 300MB
      },
    }),
  )
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan');
    }

    const isVideo =
      file.mimetype.startsWith('video/') ||
      /\.(mov|mp4|mkv|avi|webm)$/i.test(file.originalname);

    const finalFilename = file.filename;
    const finalMimetype = isVideo ? 'video/mp4' : file.mimetype;
    const finalSize = file.size;

    // Jika video (.mov, .mp4, dll), kompres & standardisasi secara background di server.
    // PENTING: Jangan menahan HTTP request dengan 'await' agar proxy Next.js / Cloudflare
    // tidak mengalami timeout / socket hang up (ECONNRESET) saat FFmpeg berjalan lama.
    if (isVideo) {
      this.optimizeVideoInBackground(file.path, file.originalname);
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const baseUrl = process.env.PUBLIC_URL || `${protocol}://${host}`;
    const relativeUrl = `/uploads/${finalFilename}`;

    return {
      url: relativeUrl,
      fullUrl: `${baseUrl}${relativeUrl}`,
      filename: finalFilename,
      originalName: file.originalname,
      mimetype: finalMimetype,
      size: finalSize,
      mediaType: isVideo ? 'video' : 'image',
      canPlayNative: isVideo ? finalSize <= 16 * 1024 * 1024 : true,
    };
  }

  private async optimizeVideoInBackground(filePath: string, originalName: string) {
    const tempOutputPath = `${filePath}.opt.mp4`;
    const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
    this.logger.log(`[FFMPEG-ASYNC-START] File: ${originalName} | Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    try {
      const startTime = Date.now();
      await execAsync(
        `ffmpeg -y -i "${filePath}" -vf "scale='min(720,iw)':-2" -c:v libx264 -preset fast -crf 28 -g 60 -keyint_min 30 -c:a aac -b:a 128k -movflags +faststart "${tempOutputPath}"`,
        { timeout: 360000 },
      );
      const durationMs = Date.now() - startTime;

      if (fs.existsSync(tempOutputPath) && fs.statSync(tempOutputPath).size > 0) {
        const finalSize = fs.statSync(tempOutputPath).size;
        // Atomically replace file asli dengan file yang sudah teroptimasi
        fs.unlinkSync(filePath);
        fs.renameSync(tempOutputPath, filePath);

        this.logger.log(`[FFMPEG-ASYNC-SUCCESS] Video ${originalName} berhasil dioptimasi dalam ${durationMs}ms!`);
        this.logger.log(`[FFMPEG-ASYNC-STATS] Ukuran asli: ${(fileSize / 1024 / 1024).toFixed(2)} MB -> Hasil: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
      } else {
        this.logger.warn(`[FFMPEG-ASYNC-WARN] Output file tidak ditemukan atau 0 bytes. Tetap memakai file asli.`);
      }
    } catch (err: any) {
      this.logger.error(`[FFMPEG-ASYNC-ERROR] Gagal konversi video ${originalName}: ${err.message}`);
      if (fs.existsSync(tempOutputPath)) {
        try { fs.unlinkSync(tempOutputPath); } catch {}
      }
    }
  }

  /**
   * READ: Publik agar bisa dibaca oleh Chatbot AI & guest/tampilan denah
   */
  @Public()
  @Get('groups')
  async getGroups(@Query('tenantId') tenantId: string) {
    return this.availabilityService.getGroups(tenantId);
  }

  /**
   * CUD (Create, Update, Delete): Dilindungi otentikasi JWT Guard
   * Hanya user berwenang (owner/admin/operator) yang bisa mengubah data
   */
  @UseGuards(JwtAuthGuard)
  @Post('groups')
  async createGroup(
    @Query('tenantId') tenantId: string,
    @Req() req: any,
    @Body()
    body: {
      name: string;
      category?: string;
      description?: string;
      siteplanImage?: string;
    },
  ) {
    const isSuper = req?.user?.roles?.includes('superadmin');
    const effectiveTenantId = isSuper
      ? tenantId || req?.user?.tenantId
      : req?.user?.tenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException(
        'Akses ditolak: Akun tidak terhubung dengan tenant manapun',
      );
    }
    return this.availabilityService.createGroup(effectiveTenantId, body);
  }

  @Put('groups/:id')
  async updateGroup(
    @Param('id') id: string,
    @Req() req: any,
    @Body()
    body: {
      name?: string;
      category?: string;
      description?: string;
      siteplanImage?: string;
    },
  ) {
    const tenantId = this.resolveTenantId(req);
    return this.availabilityService.updateGroup(id, body, tenantId);
  }

  @Delete('groups/:id')
  async deleteGroup(@Param('id') id: string, @Req() req: any) {
    const tenantId = this.resolveTenantId(req);
    return this.availabilityService.deleteGroup(id, tenantId);
  }

  @Post('groups/:groupId/items')
  async addItem(
    @Param('groupId') groupId: string,
    @Req() req: any,
    @Body()
    body: {
      code: string;
      name?: string;
      houseType?: string;
      status?: string;
      price?: number;
      capacity?: number;
      notes?: string;
      customerName?: string;
      customerPhone?: string;
    },
  ) {
    const tenantId = this.resolveTenantId(req);
    return this.availabilityService.addItem(groupId, body, tenantId);
  }

  @Post('groups/:groupId/batch-items')
  async addBatchItems(
    @Param('groupId') groupId: string,
    @Req() req: any,
    @Body()
    body: {
      prefix: string;
      startNumber: number;
      endNumber: number;
      houseType?: string;
      price?: number;
    },
  ) {
    const tenantId = this.resolveTenantId(req);
    return this.availabilityService.addBatchItems(
      groupId,
      body.prefix,
      body.startNumber,
      body.endNumber,
      body.houseType,
      body.price,
      tenantId,
    );
  }

  @Put('items/:id')
  async updateItem(
    @Param('id') id: string,
    @Req() req: any,
    @Body()
    body: {
      code?: string;
      name?: string;
      houseType?: string;
      status?: string;
      price?: number;
      capacity?: number;
      notes?: string;
      customerName?: string;
      customerPhone?: string;
    },
  ) {
    const tenantId = this.resolveTenantId(req);
    return this.availabilityService.updateItem(id, body, tenantId);
  }

  @Delete('items/:id')
  async deleteItem(@Param('id') id: string, @Req() req: any) {
    const tenantId = this.resolveTenantId(req);
    return this.availabilityService.deleteItem(id, tenantId);
  }
}
