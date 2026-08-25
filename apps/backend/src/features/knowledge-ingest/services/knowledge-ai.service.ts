import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ExtractedProductDto } from '../dto/extracted-product.dto';

export interface TextExtractionResult {
  intent: 'small_talk' | 'ingestion_product' | 'ingestion_knowledge' | 'ingestion_mixed';
  replyMessage: string;
  products: ExtractedProductDto[];
  knowledge_chunks: string[];
}

@Injectable()
export class KnowledgeAiService {
  private readonly logger = new Logger(KnowledgeAiService.name);
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async cleanTextToJSON(rawText: string): Promise<TextExtractionResult> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Anda adalah asisten data untuk UMKM. Anda harus membedakan apakah pengguna sedang melakukan percakapan santai, memberikan data produk katalog, atau memberikan informasi umum seputar toko."
          },
          {
            role: "user",
            content: `Kategorikan teks berikut ke dalam salah satu dari 4 intent:
1. 'small_talk': Jika percakapan biasa (sapaan, pertanyaan), isi 'replyMessage' dan kosongkan array lainnya.
2. 'ingestion_product': Jika teks murni daftar produk (ada nama, harga), isi 'products' dan kosongkan lainnya.
3. 'ingestion_knowledge': Jika teks murni informasi toko (alamat, jam buka, aturan), isi 'knowledge_chunks' dan kosongkan yang lain.
4. 'ingestion_mixed': Jika teks campur antara info produk DAN info toko (misal: "Kita buka jam 9, jual sepatu harga 100rb"), ekstrak keduanya dan isi array 'products' SERTA 'knowledge_chunks'.

TEKS:\n${rawText}`
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "extracted_products",
            schema: {
              type: "object",
              properties: {
                intent: { type: "string", enum: ["small_talk", "ingestion_product", "ingestion_knowledge", "ingestion_mixed"] },
                replyMessage: { type: "string" },
                knowledge_chunks: {
                  type: "array",
                  items: { type: "string" }
                },
                products: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      nama: { type: "string" },
                      harga: { type: "number" },
                      deskripsi: { type: "string" },
                      attributes: {
                        type: "array",
                        description: "Data variatif/spesifik produk. Misal ukuran, warna, level pedas. Ekstrak sebagai key-value.",
                        items: {
                          type: "object",
                          properties: {
                            key: { type: "string", description: "Nama atribut (misal: 'ukuran', 'warna', 'level_pedas')" },
                            value: { type: "string", description: "Nilai atribut (misal: 'S, M, L', 'Merah', '1-5')" }
                          },
                          required: ["key", "value"],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ["nama", "harga", "deskripsi", "attributes"],
                    additionalProperties: false
                  }
                }
              },
              required: ["intent", "replyMessage", "knowledge_chunks", "products"],
              additionalProperties: false
            },
            strict: true
          }
        }
      });

      const jsonStr = response.choices[0].message.content;
      if (!jsonStr) return { intent: 'small_talk', replyMessage: "Maaf, saya tidak mengerti maksud Anda.", products: [], knowledge_chunks: [] };
      const parsed = JSON.parse(jsonStr);
      return {
        intent: parsed.intent || 'small_talk',
        replyMessage: parsed.replyMessage || '',
        products: parsed.products || [],
        knowledge_chunks: parsed.knowledge_chunks || []
      };
    } catch (e) {
      this.logger.error(`Gagal membersihkan teks via AI: ${e.message}`);
      return { intent: 'small_talk', replyMessage: "Maaf, terjadi kesalahan saat memproses pesan Anda.", products: [], knowledge_chunks: [] };
    }
  }
}
