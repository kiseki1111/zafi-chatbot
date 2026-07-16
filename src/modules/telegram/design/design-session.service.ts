import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

const EXPIRY_HOURS = 24;

@Injectable()
export class DesignSessionService {
  private readonly logger = new Logger(DesignSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getSession(userId: string) {
    return this.prisma.designSession.findUnique({ where: { userId } });
  }

  isExpired(session: any): boolean {
    if (!session) return true;
    return new Date() > new Date(session.expiresAt);
  }

  async createSession(userId: string) {
    const expiresAt = new Date(
      Date.now() + EXPIRY_HOURS * 60 * 60 * 1000,
    );
    return this.prisma.designSession.upsert({
      where: { userId },
      update: {
        step: 'prompting',
        data: {},
        expiresAt,
        lastActive: new Date(),
      },
      create: {
        userId,
        step: 'prompting',
        data: {},
        expiresAt,
      },
    });
  }

  async updateSession(userId: string, step: string, newData: object = {}) {
    const expiresAt = new Date(
      Date.now() + EXPIRY_HOURS * 60 * 60 * 1000,
    );
    return this.prisma.designSession.update({
      where: { userId },
      data: {
        step,
        data: newData,
        lastActive: new Date(),
        expiresAt,
      },
    });
  }

  async saveGeneration(
    userId: string,
    prompt: string | null,
    imageUrl: string | null,
    designType: string,
    status: string = 'success',
  ) {
    return this.prisma.designGeneration.create({
      data: { userId, prompt, imageUrl, designType, status },
    });
  }

  /**
   * Upload gambar ke Supabase Storage dan simpan record ke DB.
   * Returns public URL atau null jika Supabase tidak dikonfigurasi.
   */
  async saveAssetToSupabase(
    userId: string,
    imageBase64: string,
    metadata: object = {},
  ): Promise<string | null> {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn('Supabase credentials not found. Skipping upload.');
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const filename = `design-bot/${userId}/asset_${Date.now()}.png`;
    const buffer = Buffer.from(imageBase64, 'base64');

    const { error } = await supabase.storage
      .from('asset-telegram')
      .upload(filename, buffer, { contentType: 'image/png', upsert: true });

    if (error) {
      this.logger.error('Gagal upload ke Supabase:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('asset-telegram')
      .getPublicUrl(filename);

    return urlData.publicUrl;
  }
}
