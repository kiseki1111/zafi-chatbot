import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ExtractedProductDto } from '../../dto/extracted-product.dto';
const sharp = require('sharp');

@Injectable()
export class ImageParser {
  private readonly logger = new Logger(ImageParser.name);
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ||
      this.configService.get<string>('OPENAI_API_KEY');
    const baseURL = this.configService.get<string>('OPENROUTER_API_KEY')
      ? 'https://openrouter.ai/api/v1'
      : undefined;

    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key-placeholder',
      baseURL,
    });
  }

  async parseImage(buffer: Buffer): Promise<ExtractedProductDto[]> {
    try {
      const resizedBuffer = await sharp(buffer)
        .resize({
          width: 1024,
          height: 1024,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      const base64Image = resizedBuffer.toString('base64');
      const response = await this.openai.chat.completions.create({
        model:
          this.configService.get<string>('OPENAI_MODEL') ||
          'deepseek/deepseek-v4-flash-0731',
        messages: [
          {
            role: 'system',
            content:
              'Anda adalah asisten data ekstraksi katalog. Ekstrak daftar produk dan harganya dari gambar ini.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Tolong ekstrak daftar produk, harga, dan deskripsi dari gambar brosur/katalog ini.',
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}` },
              },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'extracted_products',
            schema: {
              type: 'object',
              properties: {
                products: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      nama: { type: 'string' },
                      harga: { type: 'number' },
                      deskripsi: { type: 'string' },
                    },
                    required: ['nama', 'harga', 'deskripsi'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['products'],
              additionalProperties: false,
            },
            strict: true,
          },
        },
      });

      const jsonStr = response.choices[0].message.content;
      if (!jsonStr) return [];
      const parsed = JSON.parse(jsonStr);
      return parsed.products || [];
    } catch (e) {
      this.logger.error(`Gagal ekstrak gambar via AI: ${e.message}`);
      return [];
    }
  }
}
