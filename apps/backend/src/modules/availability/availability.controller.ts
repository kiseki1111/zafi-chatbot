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

const execAsync = promisify(exec);

@Controller('api/v1/availability')
export class AvailabilityController {
  private readonly logger = new Logger(AvailabilityController.name);

  constructor(private readonly availabilityService: AvailabilityService) {}

  @Public()
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
          cb(null, `${uniqueSuffix}-${cleanName}${ext}`);
        },
      }),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
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

    let finalFilename = file.filename;
    let finalMimetype = file.mimetype;
    let finalSize = file.size;

    // Jika video, lakukan standardisasi otomatis dengan ffmpeg:
    // H.264 + AAC + +faststart (agar WhatsApp mengenali durasi normal & bisa streaming)
    if (file.mimetype.startsWith('video/')) {
      const inputPath = file.path;
      const optimizedFilename = `opt-${file.filename.replace(/\.[^/.]+$/, '')}.mp4`;
      const outputPath = join(process.cwd(), 'uploads', optimizedFilename);

      this.logger.log(`[FFMPEG-START] File: ${file.originalname} | Mimetype: ${file.mimetype} | Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      this.logger.log(`[FFMPEG-CMD] input="${inputPath}" -> output="${outputPath}"`);

      try {
        const startTime = Date.now();
        const { stdout, stderr } = await execAsync(
          `ffmpeg -y -i "${inputPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`,
          { timeout: 90000 },
        );

        const durationMs = Date.now() - startTime;

        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
          finalFilename = optimizedFilename;
          finalMimetype = 'video/mp4';
          finalSize = fs.statSync(outputPath).size;

          // Hapus file raw input untuk hemat storage
          fs.unlink(inputPath, () => null);

          this.logger.log(`[FFMPEG-SUCCESS] Video berhasil dioptimasi dalam ${durationMs}ms!`);
          this.logger.log(`[FFMPEG-STATS] Ukuran asli: ${(file.size / 1024 / 1024).toFixed(2)} MB -> Hasil: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
        } else {
          this.logger.warn(`[FFMPEG-WARN] Output file tidak ditemukan atau 0 bytes. Tetap memakai file asli.`);
        }
      } catch (err: any) {
        this.logger.error(`[FFMPEG-ERROR] Gagal konversi video: ${err.message}`);
        if (err.stderr) {
          this.logger.error(`[FFMPEG-STDERR]: ${err.stderr.slice(-500)}`);
        }
        this.logger.warn(`[FFMPEG-FALLBACK] Menggunakan file video asli tanpa optimasi.`);
      }
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
      mediaType: finalMimetype.startsWith('video/') ? 'video' : 'image',
    };
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
  @Post('groups')
  async createGroup(
    @Query('tenantId') tenantId: string,
    @Body()
    body: {
      name: string;
      category?: string;
      description?: string;
      siteplanImage?: string;
    },
  ) {
    return this.availabilityService.createGroup(tenantId, body);
  }

  @Put('groups/:id')
  async updateGroup(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      category?: string;
      description?: string;
      siteplanImage?: string;
    },
  ) {
    return this.availabilityService.updateGroup(id, body);
  }

  @Delete('groups/:id')
  async deleteGroup(@Param('id') id: string) {
    return this.availabilityService.deleteGroup(id);
  }

  @Post('groups/:groupId/items')
  async addItem(
    @Param('groupId') groupId: string,
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
    return this.availabilityService.addItem(groupId, body);
  }

  @Post('groups/:groupId/batch-items')
  async addBatchItems(
    @Param('groupId') groupId: string,
    @Body()
    body: {
      prefix: string;
      startNumber: number;
      endNumber: number;
      houseType?: string;
      price?: number;
    },
  ) {
    return this.availabilityService.addBatchItems(
      groupId,
      body.prefix,
      body.startNumber,
      body.endNumber,
      body.houseType,
      body.price,
    );
  }

  @Put('items/:id')
  async updateItem(
    @Param('id') id: string,
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
    return this.availabilityService.updateItem(id, body);
  }

  @Delete('items/:id')
  async deleteItem(@Param('id') id: string) {
    return this.availabilityService.deleteItem(id);
  }
}
