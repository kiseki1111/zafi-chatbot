import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';
import { Readable } from 'stream';

export interface ImageGenerateResult {
  success: boolean;
  imageBase64?: string;
  generatedPrompt?: string;
  error?: string;
}

@Injectable()
export class DesignImageService {
  private readonly logger = new Logger(DesignImageService.name);
  private openaiImage: OpenAI;
  private openaiChat: OpenAI;

  constructor(private readonly configService: ConfigService) {
    // Untuk image generation (gpt-image-2)
    const imageKey =
      this.configService.get<string>('OPENAI_IMAGE_KEY') ||
      this.configService.get<string>('OPENAI_API_KEY');
    // Untuk GPT-4o vision (chat/analisis)
    const chatKey = this.configService.get<string>('OPENAI_API_KEY');

    this.openaiImage = new OpenAI({ apiKey: imageKey });
    this.openaiChat = new OpenAI({ apiKey: chatKey });
  }

  private base64ToReadable(base64String: string): Readable {
    const buffer = Buffer.from(base64String, 'base64');
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    return readable;
  }

  base64ToBuffer(base64String: string): Buffer {
    return Buffer.from(base64String, 'base64');
  }

  /**
   * Generate image biasa (text-to-image) menggunakan gpt-image-2
   */
  async generate(
    prompt: string,
    size: string = '1024x1792',
  ): Promise<ImageGenerateResult> {
    try {
      const response = await this.openaiImage.images.generate({
        model: 'gpt-image-2',
        prompt,
        n: 1,
        size: size as any,
      });

      const data = response.data[0];
      let base64: string;

      if (data.b64_json) {
        base64 = data.b64_json;
      } else if (data.url) {
        const imageResponse = await fetch(data.url);
        const arrayBuffer = await imageResponse.arrayBuffer();
        base64 = Buffer.from(arrayBuffer).toString('base64');
      } else {
        throw new Error('Format gambar tidak dikenali dari API OpenAI');
      }

      return { success: true, imageBase64: base64 };
    } catch (error) {
      this.logger.error('Image generation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate poster dengan referensi (2 langkah):
   *   Langkah 1 → GPT-4o menganalisis gambar aset + referensi → ultra-detail prompt
   *   Langkah 2 → gpt-image-2 images.edit() menggunakan prompt tersebut + gambar aset
   */
  async generateWithReference(
    base64Aset: string,
    base64Referensi: string,
    instruksiTambahan: string = '',
    size: string = '1024x1536',
  ): Promise<ImageGenerateResult> {
    try {
      // ── LANGKAH 1: GPT-4o melihat KEDUA gambar sekaligus ──
      this.logger.log('[1/2] GPT-4o menganalisis kedua gambar...');

      const analisis = await this.openaiChat.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert graphic designer and prompt engineer.
You will receive TWO images:
- IMAGE A (aset): The source photo — a house/property photo that will become the hero image of the poster.
- IMAGE B (referensi): A finished promotional poster — this is the design template to replicate.

Your job is to write ONE highly detailed image generation prompt in English that:

1. LAYOUT (from IMAGE B):
   - Describe the exact poster layout zones (top header area, main photo placement, text overlay areas, bottom price band, etc.)
   - Mention the exact color of each zone (provide hex-like descriptions: "deep navy blue #1a2744", "warm cream #f5f0e8")
   - Describe the diagonal or geometric shape separating sections if any
   - Describe background color and texture

2. TYPOGRAPHY (from IMAGE B):
   - Describe every text element: position, size (large/medium/small), weight (bold/thin), style (italic/script/sans-serif), and color
   - Include ALL actual text labels that should appear (in Indonesian, as in the reference)

3. BADGES & DECORATIVE ELEMENTS (from IMAGE B):
   - Describe all badges, icons, circles, or call-out elements with their position, shape, color, and text content
   - Describe icon styles (line icons, filled, etc.)

4. HERO IMAGE (from IMAGE A):
   - Describe the house/property from IMAGE A accurately: color, roof style, architecture style, number of floors, landscaping
   - Specify where it should be placed in the poster (full-width center, slightly left-aligned, etc.)
   - Mention it should keep the realistic photo style

5. ADDITIONAL INSTRUCTION:
   - ${instruksiTambahan}

Write the prompt as a single cohesive paragraph or structured prompt — NOT as bullet points.
The prompt must be specific enough that an AI image generator can reproduce a layout nearly identical to IMAGE B but using the house from IMAGE A.
Respond in English only.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Aset}`,
                  detail: 'high',
                },
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Referensi}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 1500,
      });

      const promptUltraDetail = analisis.choices[0].message.content!;
      this.logger.log('[1/2] GPT-4o prompt berhasil dihasilkan');

      // ── LANGKAH 2: gpt-image-2 generate poster ──
      this.logger.log('[2/2] Generating poster dengan gpt-image-2...');

      const asetStream = this.base64ToReadable(base64Aset);
      const asetFile = await toFile(asetStream, 'aset.png', { type: 'image/png' });

      const response = await this.openaiImage.images.edit({
        model: 'gpt-image-2',
        image: asetFile,
        prompt: promptUltraDetail,
        size: size as any,
        quality: 'medium',
      } as any);

      const data = response.data[0];
      let base64Result: string;

      if (data.b64_json) {
        base64Result = data.b64_json;
      } else if (data.url) {
        const imageResponse = await fetch(data.url);
        const arrayBuffer = await imageResponse.arrayBuffer();
        base64Result = Buffer.from(arrayBuffer).toString('base64');
      } else {
        throw new Error('Format gambar tidak dikenali dari API OpenAI');
      }

      this.logger.log('[2/2] Poster berhasil digenerate!');
      return {
        success: true,
        imageBase64: base64Result,
        generatedPrompt: promptUltraDetail,
      };
    } catch (error) {
      this.logger.error('generateWithReference error:', error);
      return { success: false, error: error.message };
    }
  }
}
