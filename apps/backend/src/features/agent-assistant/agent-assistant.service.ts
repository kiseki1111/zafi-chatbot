import { Injectable, InternalServerErrorException, forwardRef, Inject, Logger } from '@nestjs/common';
import { OpenAI } from 'openai';
import { RagService } from '../knowledge-ingest/rag.service';
import { OPENAI_CLIENT } from '../../core/openai/openai.module';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AgentSharedService } from '../../core/agent-shared/agent-shared.service';
import { IngestionRouterService } from '../knowledge-ingest/services/ingestion-router.service';
import { DataAgentService } from '../knowledge-ingest/data-agent.service';

@Injectable()
export class AgentAssistantService {
  private openai: OpenAI | null;
  private readonly logger = new Logger(AgentAssistantService.name);

  constructor(
    @Inject(forwardRef(() => RagService))
    private ragService: RagService,
    @Inject(OPENAI_CLIENT) private injectedOpenai: OpenAI | null,
    private prisma: PrismaService,
    private readonly agentSharedService: AgentSharedService,
    @Inject(forwardRef(() => IngestionRouterService))
    private ingestionRouterService: IngestionRouterService,
    @Inject(forwardRef(() => DataAgentService))
    private dataAgentService: DataAgentService,
  ) {
    this.openai = this.injectedOpenai;
  }

  async detectOwnerIntent(message: string, mediaUrls?: string[]): Promise<'INGEST_KNOWLEDGE' | 'GENERAL_ASSISTANT'> {
    let text = message;
    if (mediaUrls && mediaUrls.length > 0) {
        this.logger.log(`[AGENT-ASSISTANT] Menganalisis gambar dari owner...`);
        const imgDesc = await this.agentSharedService.analyzeImage(mediaUrls[0], "Jika ini adalah nota/struk, sebutkan barang apa yang terjual dan berapa jumlahnya. Jika ini foto barang, sebutkan nama barangnya.");
        text += `\n[Owner melampirkan gambar: ${imgDesc}]`;
    }

    const systemPrompt = `You are an intent router for a business owner's personal assistant bot.
Classify their intent into exactly ONE of the following categories:
- INGEST_KNOWLEDGE: If the user wants to add, insert, save, upload, or remember NEW information, bulk products, or new rules to the database from scratch.
- GENERAL_ASSISTANT: For ALL other requests, including modifying/updating existing data, deleting products, asking questions, giving commands, reporting sales, or chatting.

Respond with ONLY the category word: INGEST_KNOWLEDGE or GENERAL_ASSISTANT.`;

    try {
      const intent = await this.agentSharedService.callLLM(`The owner sent a message: "${message}"`, systemPrompt);
      const cleanIntent = intent.trim().toUpperCase();
      return cleanIntent === 'INGEST_KNOWLEDGE' ? 'INGEST_KNOWLEDGE' : 'GENERAL_ASSISTANT';
    } catch (e) {
      return 'GENERAL_ASSISTANT';
    }
  }

  async chatWithOwnerAssistant(text: string, tenantId?: string, chatId: string = 'default', onChunk?: (chunk: string) => void): Promise<string> {
    if (!this.openai) return 'Maaf, API Key OpenAI tidak terkonfigurasi.';

    let context = '';
    let catalogContext = '';
    
    try {
      this.logger.log(`[AGENT-ASSISTANT] Asisten Owner mencari context untuk tenantId: ${tenantId}, query: "${text}"`);
      
      // Gunakan RAG Search untuk mencari konteks yang hanya relevan dengan text (query)
      const relevantContext = await this.ragService.searchRelevantContext(text, 10, tenantId);
      context = relevantContext ? `--- DATA RELEVAN DARI DATABASE ---\n${relevantContext}` : '';
      this.logger.log(`[AGENT-ASSISTANT] RAG Context Ditemukan (Panjang: ${context.length})`);
    } catch (e) {
      this.logger.warn('Gagal mengambil konteks untuk asisten owner: ' + e.message);
    }

    let checklistInfo = '';
    if (tenantId) {
       try {
           const totalProduk = await this.prisma.product.count({ where: { tenantId } });
           const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
           
           if (tenant) {
               let kelengkapanToko: string[] = [];
               if (totalProduk === 0) kelengkapanToko.push("- Katalog Produk (Kirim foto brosur/excel/tulis manual)");
               if (!tenant.address) kelengkapanToko.push("- Alamat Toko");
               if (!tenant.operatingHours) kelengkapanToko.push("- Jam Operasional");
               if (!tenant.returnPolicy) kelengkapanToko.push("- Kebijakan Retur / Garansi");
               if (!tenant.agentName || tenant.agentName === 'Luna') kelengkapanToko.push("- Identitas Bot CS (Nama dan gaya bahasa)");
               
               if (kelengkapanToko.length > 0) {
                   checklistInfo = `
INFO STATUS TOKO:
Saat ini, database toko masih belum lengkap. Hal yang belum diisi:
${kelengkapanToko.join('\n')}

TUGAS UTAMA ANDA SEKARANG:
Karena Bos baru pertama kali pakai, Anda WAJIB langsung menyapa dan menyebutkan daftar di atas yang masih kurang. 
JANGAN cuma bilang "Ada yang bisa dibantu?". Anda harus PROAKTIF menagih data tersebut.
Contoh: "Halo Bos! Selamat datang. Agar bot CS kita bisa jalan, yuk kita lengkapi datanya dulu. Saat ini kita belum punya Katalog Produk nih, Bos bisa kirim fotonya ke sini..."`;
               } else {
                   checklistInfo = `\n=== STATUS ONBOARDING ===\nData toko sudah 100% lengkap. CS Bot siap melayani pelanggan.`;
               }
           }
       } catch (e) {
           this.logger.error('Gagal cek kelengkapan toko', e);
       }
    }
    // ----------------------------------------------

    let systemPrompt = `Anda adalah Asisten Pribadi cerdas untuk pemilik UMKM.
Hari ini adalah: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

${checklistInfo}

Tugas Anda:
1. Membantu pemilik mengelola bisnis, menjawab pertanyaan strategis, memberikan ringkasan produk, atau sekadar teman diskusi (brainstorming).
2. Jika mereka memberikan instruksi untuk memasukkan data produk/knowledge, arahkan mereka bahwa Anda bisa memprosesnya (karena sistem router akan mengambil alih jika terdeteksi niat INGEST).
3. Bersikap profesional namun hangat layaknya asisten eksekutif. Anda terisolasi dari CS Bot, sehingga Anda fokus melayani internal/owner saja.
4. Anda memiliki akses ke database (Katalog & Knowledge Base). Gunakan informasi dari database ini untuk menjawab pertanyaan owner seputar bisnisnya.
5. Jika ada informasi yang kurang saat owner meminta sesuatu (misalnya lupa menyebutkan ukuran/varian saat mencatat penjualan), tanyakan kembali dengan bahasa yang sopan, santai, dan natural layaknya manusia sungguhan. Contoh: "Baik Bos, siap dicatat! Tapi boleh tahu untuk sepatunya ukuran berapa ya agar stoknya pas?". JANGAN membalas dengan kaku seperti robot ("Mohon informasikan nama produk, varian...").

ATURAN KOMUNIKASI & FORMATTING (WAJIB DIIKUTI):
- DILARANG KERAS menggunakan simbol Markdown (*, **, _, #). Balas dengan teks murni.
- DILARANG menggunakan format link markdown seperti [Teks](URL) atau [GAMBAR](URL).
- Jika ada gambar pada katalog yang relevan, KELUARKAN TAG GAMBAR secara mentah di baris baru persis seperti ini:
[GAMBAR: Nama Produk] https://url-gambar.com

- Jika pemilik melaporkan adanya penjualan barang, gunakan alat (tool) 'record_sale' untuk memotong stok dan mencatat transaksi. Setelah berhasil, berikan balasan yang SANGAT SINGKAT dan JELAS (hanya konfirmasi sukses dan sisa stok). JANGAN berikan info omset, nomor resi, atau hal bertele-tele lainnya.
- Jika pemilik menanyakan laporan penjualan, omset, atau histori penjualan (misal: "hari apa saja saya jualan?"), JANGAN MENOLAK. Langsung gunakan alat 'build_sales_query'. Anda boleh mengosongkan parameter tanggal (startDate/endDate) jika pemilik tidak spesifik menyebutkannya, alat ini akan otomatis menarik seluruh data atau data terbaru untuk Anda analisis. Jangan memaksa pemilik memberikan format tanggal yang kaku.
- Jika pemilik meminta untuk mengatur atau mengubah identitas bot CS (nama bot, gaya bahasa/tone, atau nomor kontak darurat/fallback), WAJIB gunakan alat (tool) 'update_cs_bot'. JANGAN JAWAB DENGAN PENJELASAN TEORITIS TENTANG CS BOT. Eksekusi tool tersebut dan jawab dengan santai bahwa pengaturan sudah selesai.

=== DATABASE BISNIS SAAT INI ===
${context ? context : 'Tidak ada data spesifik yang ditemukan di database untuk pertanyaan ini.'}
================================`;

    const tools = [
      {
        type: 'function',
        function: {
          name: 'record_sale',
          description: 'Mencatat penjualan produk, mengurangi stok, dan merekam omset ke sistem. Gunakan ini jika owner melapor ada barang yang laku/terjual.',
          parameters: {
            type: 'object',
            properties: {
              product_name: {
                type: 'string',
                description: 'Nama produk yang terjual, misalnya "Sepatu Sneakers Aerostep V1"',
              },
              quantity: {
                type: 'integer',
                description: 'Jumlah produk yang terjual',
              },
              customer_name: {
                type: 'string',
                description: 'Nama pembeli (jika disebutkan owner)',
              },
              variant: {
                type: 'string',
                description: 'Wajib diisi jika produk memiliki ukuran, warna, atau tipe. Jika owner tidak menyebutkan varian, tanyakan kembali.',
              },
              notes: {
                type: 'string',
                description: 'Catatan tambahan (jika ada)',
              },
            },
            required: ['product_name', 'quantity', 'variant'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'build_sales_query',
          description: 'Membuat filter untuk menarik laporan penjualan (omset/qty). Panggil ini untuk menjawab SEMUA pertanyaan seputar laporan, rekap, omset, penjualan, atau histori. Semua parameter BERSIFAT OPSIONAL. Kosongkan parameter jika user bertanya secara umum (misal: "kapan saja barang laku?").',
          parameters: {
            type: 'object',
            properties: {
              startDate: { type: 'string', description: 'Format YYYY-MM-DD' },
              endDate: { type: 'string', description: 'Format YYYY-MM-DD' },
              productName: { type: 'string', description: 'Nama produk jika mencari spesifik' },
              startHour: { type: 'integer', description: 'Jam mulai (0-23)' },
              endHour: { type: 'integer', description: 'Jam akhir (0-23)' },
            },
          },
        },
      },

      {
        type: 'function',
        function: {
          name: 'delete_product',
          description: 'Menghapus produk dari database. Gunakan tool ini jika pemilik secara eksplisit meminta untuk menghapus produk tertentu.',
          parameters: {
            type: 'object',
            properties: {
              product_name: {
                type: 'string',
                description: 'Nama produk yang ingin dihapus, misalnya "Sepatu Jogging Ultra Pro"',
              },
            },
            required: ['product_name'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'bulk_update_price',
          description: 'Mengubah harga semua produk secara massal berdasarkan persentase atau nominal tetap. Gunakan jika owner bilang "naikkan semua harga 10%" atau "turunkan semua harga 5000".',
          parameters: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['percentage', 'fixed'],
                description: 'Tipe perubahan: percentage (persen) atau fixed (nominal)',
              },
              amount: {
                type: 'number',
                description: 'Nilai perubahannya (misal 10 untuk 10%, atau 5000 untuk Rp5.000). Gunakan minus jika diskon/turun.',
              },
            },
            required: ['type', 'amount'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_product',
          description: 'Mengubah atau mengupdate data produk di database (seperti harga, stok, deskripsi, atau kategori). Gunakan tool ini jika pemilik meminta untuk mengubah data.',
          parameters: {
            type: 'object',
            properties: {
              product_name: {
                type: 'string',
                description: 'Nama produk yang ingin diubah',
              },
              new_price: {
                type: 'integer',
                description: 'Harga baru (opsional)',
              },
              new_stock: {
                type: 'integer',
                description: 'Stok baru (opsional)',
              },
              new_description: {
                type: 'string',
                description: 'Deskripsi baru (opsional)',
              },
              new_category: {
                type: 'string',
                description: 'Kategori baru (opsional)',
              },
            },
            required: ['product_name'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_store_info',
          description: 'Mengubah atau mengisi informasi profil toko (alamat, jam buka, kebijakan retur). Gunakan tool ini jika pemilik memberikan informasi toko tersebut.',
          parameters: {
            type: 'object',
            properties: {
              address: {
                type: 'string',
                description: 'Alamat toko (opsional)',
              },
              operatingHours: {
                type: 'string',
                description: 'Jam operasional toko (opsional)',
              },
              returnPolicy: {
                type: 'string',
                description: 'Kebijakan retur atau garansi toko (opsional)',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_cs_bot',
          description: 'Mengatur identitas bot Customer Service (CS) seperti nama, gaya bahasa, dan kontak darurat. Gunakan ini jika pemilik meminta untuk mengatur bot CS.',
          parameters: {
            type: 'object',
            properties: {
              agentName: {
                type: 'string',
                description: 'Nama untuk bot CS, misal "Mbak Mila", "Budi", dll',
              },
              agentTone: {
                type: 'string',
                description: 'Gaya bahasa bot CS, misal "ramah", "anak jaksel", "formal"',
              },
              fallbackContact: {
                type: 'string',
                description: 'Nomor telepon atau kontak darurat jika bot tidak bisa menjawab',
              },
            },
          },
        },
      }
    ];

    try {
      this.logger.log(`[AGENT-ASSISTANT] Mengirim request ke OpenAI untuk Owner Assistant...`);
      
      // --- INJEKSI MEMORI (Dari Database via AgentSharedService) ---
      // Ambil 16 konteks terakhir dari database
      const recentMessages = await this.agentSharedService.getRecentContext(chatId, 'telegram-dev-bot', 16);
      
      const chatHistory = recentMessages.map(m => ({
         role: m.senderType === 'customer' ? 'user' : 'assistant',
         content: m.content
      }));
      // Tambahkan pesan bos saat ini (opsional jika getRecentContext belum mencakup pesan ini karena delay DB, 
      // tapi telegram.service.ts menyimpannya SEBELUM memanggil fungsi ini, jadi sudah masuk DB!)
      // Wait, untuk memastikan tidak double, kita tidak perlu menambahkan pesan saat ini jika sudah ada di DB.
      // Tapi untuk safety, kita asumsikan getRecentContext sudah mencakup pesan terakhir.
      
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        ...chatHistory
      ];

      let responseMessage: any;
      let isToolCall = false;

      if (onChunk) {
         const streamResponse = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            tools: tools as any,
            tool_choice: 'auto',
            temperature: 0.7,
            stream: true,
         });

         let fullText = '';
         let toolCallsBuffer: any[] = [];

         for await (const chunk of streamResponse) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.tool_calls) {
               isToolCall = true;
               for (const toolCall of delta.tool_calls) {
                  const index = toolCall.index;
                  if (!toolCallsBuffer[index]) {
                     toolCallsBuffer[index] = {
                        id: toolCall.id,
                        type: 'function',
                        function: { name: toolCall.function?.name || '', arguments: '' }
                     };
                  }
                  if (toolCall.function?.arguments) {
                     toolCallsBuffer[index].function.arguments += toolCall.function.arguments;
                  }
               }
            } else if (delta?.content) {
               fullText += delta.content;
               onChunk(delta.content);
            }
         }

         if (isToolCall) {
             responseMessage = {
                 role: 'assistant',
                 content: null,
                 tool_calls: toolCallsBuffer
             };
         } else {
             responseMessage = {
                 role: 'assistant',
                 content: fullText
             };
         }
      } else {
          let response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            tools: tools as any,
            tool_choice: 'auto',
            temperature: 0.7,
          });
          responseMessage = response.choices[0].message;
      }

      // Handle Tool Calls
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        this.logger.log(`[AGENT-ASSISTANT] OpenAI memanggil tool(s): ${responseMessage.tool_calls.map((t: any) => t.function?.name).join(', ')}`);
        
        // Push the assistant's tool call request to messages
        messages.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls as any[]) {
          let args: any = {};
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (jsonErr) {
            this.logger.error(`AI Hallucination: Gagal parse JSON argumen tool ${toolCall.function.name}`);
            messages.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: toolCall.function.name,
              content: "Error: Argumen yang Anda berikan bukan JSON yang valid. Tolong perbaiki format JSON-nya.",
            });
            continue;
          }

          if (toolCall.type === 'function' && toolCall.function.name === 'record_sale') {
            const { product_name, quantity, customer_name, notes, variant } = args;
            this.logger.log(`[AGENT-ASSISTANT] Mengeksekusi record_sale untuk "${product_name}" sebanyak ${quantity} pcs.`);
            
            // Lakukan eksekusi database
            let toolResponseContent = '';
            try {
              // Cari produk berdasarkan kemiripan nama
              const product = await this.prisma.product.findFirst({
                where: {
                  tenantId,
                  name: { contains: product_name, mode: 'insensitive' }
                }
              });

              if (product) {
                let updatedAttributes = product.attributes as any;
                let variantMessage = '';

                if (variant && updatedAttributes && typeof updatedAttributes === 'object' && updatedAttributes.variants) {
                   if (updatedAttributes.variants[variant] !== undefined) {
                     updatedAttributes.variants[variant] = Math.max(0, updatedAttributes.variants[variant] - quantity);
                     variantMessage = ` (Varian: ${variant})`;
                   }
                }

                // Potong stok
                await this.prisma.product.update({
                  where: { id: product.id },
                  data: { 
                    stock: { decrement: quantity },
                    attributes: updatedAttributes
                  }
                });
                
                await this.dataAgentService.syncKnowledgeBase(tenantId);

                // Generate Receipt Number
                const now = new Date();
                const dateString = now.toISOString().slice(0, 10).replace(/-/g, '');
                const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
                const receiptNumber = `INV-${dateString}-${randomStr}`;

                // Catat transaksi
                const totalPrice = Number(product.price) * quantity;
                await (this.prisma as any).salesRecord.create({
                  data: {
                    receiptNumber,
                    tenantId: tenantId!,
                    productId: product.id,
                    quantity: quantity,
                    totalPrice: totalPrice,
                    customerName: customer_name || null,
                    notes: notes || null,
                    attributes: variant ? { variant: variant } : {},
                    source: 'OWNER_REPORT'
                  }
                });

                const finalVariantStock = (variant && updatedAttributes?.variants?.[variant] !== undefined) ? updatedAttributes.variants[variant] : null;
                const sisaTeks = finalVariantStock !== null ? `Sisa stok varian ${variant}: ${finalVariantStock}` : `Sisa stok total: ${product.stock - quantity}`;
                toolResponseContent = `Berhasil dicatat. ${sisaTeks}.`;
              } else {
                toolResponseContent = `Gagal. Produk dengan nama mirip "${product_name}" tidak ditemukan di database.`;
              }
            } catch (dbError) {
              this.logger.error(`Database error saat record_sale: ${dbError.message}`);
              toolResponseContent = `Gagal mencatat ke database karena terjadi kesalahan internal.`;
            }

            // Push the tool result to messages
            messages.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: toolCall.function.name,
              content: toolResponseContent,
            });

          } else if (toolCall.type === 'function' && toolCall.function.name === 'build_sales_query') {
            const { startDate, endDate, productName, startHour, endHour } = args;
            this.logger.log(`[AGENT-ASSISTANT] Mengeksekusi build_sales_query dengan args: ${JSON.stringify(args)}`);

            let toolResponseContent = '';
            try {
              // 1. Hardcode Tenant ID
              const whereClause: any = { tenantId };

              // 2. Tanggal
              if (startDate && endDate) {
                // Parse date string into Jakarta Time (UTC+7)
                const start = new Date(`${startDate}T00:00:00+07:00`);
                const end = new Date(`${endDate}T23:59:59.999+07:00`);
                
                whereClause.soldAt = {
                  gte: start,
                  lte: end,
                };
              }

              // 3. Filter produk (dengan relasi)
              if (productName) {
                whereClause.product = {
                  name: { contains: productName, mode: 'insensitive' }
                };
              }

              let baseQuery = `
                FROM sales_records s
                LEFT JOIN products p ON s.product_id = p.id
                WHERE s.tenant_id = $1
              `;
              const params: any[] = [tenantId];
              let paramIdx = 2;

              if (startDate && endDate) {
                baseQuery += ` AND s.sold_at >= $${paramIdx++} AND s.sold_at <= $${paramIdx++}`;
                const start = new Date(`${startDate}T00:00:00+07:00`);
                const end = new Date(`${endDate}T23:59:59.999+07:00`);
                params.push(start, end);
              }

              if (productName) {
                baseQuery += ` AND p.name ILIKE $${paramIdx++}`;
                params.push(`%${productName}%`);
              }

              if (startHour !== undefined && endHour !== undefined) {
                baseQuery += ` AND EXTRACT(HOUR FROM (s.sold_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')) BETWEEN ${Number(startHour)} AND ${Number(endHour)}`;
              }

              const aggQuery = `SELECT COALESCE(SUM(s.quantity), 0)::int as total_quantity, COALESCE(SUM(s."totalPrice"), 0)::numeric as total_omset, COUNT(s.id)::int as total_count ${baseQuery}`;
              const aggResult = await this.prisma.$queryRawUnsafe<any[]>(aggQuery, ...params);
              
              const totalQuantity = aggResult[0]?.total_quantity || 0;
              const totalOmset = aggResult[0]?.total_omset || 0;
              const totalCount = aggResult[0]?.total_count || 0;

              const listQuery = `
                SELECT s.quantity, s."totalPrice", s.sold_at, s.attributes, p.name as product_name
                ${baseQuery}
                ORDER BY s.sold_at DESC
                LIMIT 50
              `;
              const recentRecords = await this.prisma.$queryRawUnsafe<any[]>(listQuery, ...params);

              const transaction_times = recentRecords.map((r: any) => {
                const dt = new Date(r.sold_at);
                const datePart = dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
                const timePart = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
                
                let variantStr = '';
                if (r.attributes && typeof r.attributes === 'object' && r.attributes.variant) {
                   variantStr = ` (Varian: ${r.attributes.variant})`;
                } else if (typeof r.attributes === 'string') {
                   try {
                     const parsed = JSON.parse(r.attributes);
                     if (parsed.variant) variantStr = ` (Varian: ${parsed.variant})`;
                   } catch (e) {}
                }
                const pName = r.product_name || 'Item';
                
                return `${datePart}, Jam ${timePart} WIB - Terjual ${r.quantity} pcs ${pName}${variantStr}`;
              });

              toolResponseContent = JSON.stringify({
                status: 'success',
                total_transactions_count: totalCount,
                total_quantity_sold: totalQuantity,
                total_omset: totalOmset,
                transaction_times: transaction_times,
                filters_applied: args
              });

            } catch (dbError) {
              this.logger.error(`Database error saat build_sales_query: ${dbError.message}`);
              toolResponseContent = JSON.stringify({ error: 'Gagal menarik data dari database.' });
            }

            // Push the tool result to messages
            messages.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: toolCall.function.name,
              content: toolResponseContent,
            });
          } else if (toolCall.type === 'function' && toolCall.function.name === 'delete_product') {
            const { product_name } = args;
            this.logger.log(`[AGENT-ASSISTANT] Mengeksekusi delete_product untuk "${product_name}"`);
            
            let toolResponseContent = '';
            try {
              const product = await this.prisma.product.findFirst({
                where: {
                  tenantId,
                  name: { contains: product_name, mode: 'insensitive' }
                }
              });

              if (product) {
                const salesCount = await this.prisma.salesRecord.count({ where: { productId: product.id } });
                if (salesCount > 0) {
                  toolResponseContent = `GAGAL: Produk "${product.name}" punya ${salesCount} riwayat penjualan. Jika dihapus, laporan penjualan historis akan kehilangan nama produk. Tolong tanyakan konfirmasi ke owner: "Produk ini punya riwayat penjualan, yakin mau dihapus permanen?"`;
                } else {
                  await this.prisma.product.delete({
                    where: { id: product.id }
                  });
                  await this.dataAgentService.syncKnowledgeBase(tenantId);
                  toolResponseContent = `Berhasil menghapus produk "${product.name}" dari database.`;
                }
              } else {
                toolResponseContent = `Gagal. Produk dengan nama mirip "${product_name}" tidak ditemukan di database.`;
              }
            } catch (dbError: any) {
              this.logger.error(`Database error saat delete_product: ${dbError.message}`);
              toolResponseContent = `Gagal menghapus dari database karena terjadi kesalahan internal.`;
            }

            messages.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: toolCall.function.name,
              content: toolResponseContent,
            });
          } else if (toolCall.type === 'function' && toolCall.function.name === 'update_product') {
            const { product_name, new_price, new_stock, new_description, new_category } = args;
            this.logger.log(`[AGENT-ASSISTANT] Mengeksekusi update_product untuk "${product_name}"`);
            
            let toolResponseContent = '';
            try {
              const product = await this.prisma.product.findFirst({
                where: {
                  tenantId,
                  name: { contains: product_name, mode: 'insensitive' }
                }
              });

              if (product) {
                const updateData: any = {};
                if (new_price !== undefined) updateData.price = new_price;
                if (new_stock !== undefined) updateData.stock = new_stock;
                if (new_description !== undefined) updateData.description = new_description;
                if (new_category !== undefined) updateData.category = new_category;

                if (Object.keys(updateData).length > 0) {
                  await this.prisma.product.update({
                    where: { id: product.id },
                    data: updateData
                  });
                  await this.dataAgentService.syncKnowledgeBase(tenantId);
                  toolResponseContent = `Berhasil mengubah data produk "${product.name}".`;
                } else {
                  toolResponseContent = `Tidak ada data yang diubah karena parameter kosong.`;
                }
              } else {
                toolResponseContent = `Gagal. Produk dengan nama mirip "${product_name}" tidak ditemukan.`;
              }
            } catch (dbError: any) {
              this.logger.error(`Database error saat update_product: ${dbError.message}`);
              toolResponseContent = `Gagal mengubah data dari database karena terjadi kesalahan internal.`;
            }

            messages.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: toolCall.function.name,
              content: toolResponseContent,
            });
          } else if (toolCall.type === 'function' && toolCall.function.name === 'bulk_update_price') {
            const { type, amount } = args;
            this.logger.log(`[AGENT-ASSISTANT] Mengeksekusi bulk_update_price tipe ${type} sebesar ${amount}`);
            
            let toolResponseContent = '';
            try {
              if (type === 'percentage') {
                const multiplier = 1 + (amount / 100);
                await this.prisma.$executeRawUnsafe(`UPDATE products SET price = price * ${multiplier} WHERE tenant_id = $1`, tenantId);
              } else {
                await this.prisma.$executeRawUnsafe(`UPDATE products SET price = price + ${amount} WHERE tenant_id = $1`, tenantId);
              }
              await this.dataAgentService.syncKnowledgeBase(tenantId);
              toolResponseContent = `Berhasil mengupdate harga semua produk. Silakan sampaikan ke owner bahwa proses selesai.`;
            } catch (dbError: any) {
              this.logger.error(`Database error saat bulk_update_price: ${dbError.message}`);
              toolResponseContent = `Gagal mengubah data dari database karena terjadi kesalahan internal.`;
            }

            messages.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: toolCall.function.name,
              content: toolResponseContent,
            });
          } else if (toolCall.type === 'function' && toolCall.function.name === 'update_store_info') {
            const { address, operatingHours, returnPolicy } = args;
            this.logger.log(`[AGENT-ASSISTANT] Mengeksekusi update_store_info`);
            
            let toolResponseContent = '';
            try {
              if (tenantId) {
                  const updateData: any = {};
                  if (address !== undefined) updateData.address = address;
                  if (operatingHours !== undefined) updateData.operatingHours = operatingHours;
                  if (returnPolicy !== undefined) updateData.returnPolicy = returnPolicy;
                  
                  if (Object.keys(updateData).length > 0) {
                      await this.prisma.tenant.update({
                          where: { id: tenantId },
                          data: updateData
                      });
                      toolResponseContent = `Berhasil mengupdate profil toko.`;
                  } else {
                      toolResponseContent = `Tidak ada profil toko yang diubah karena parameter kosong.`;
                  }
              } else {
                  toolResponseContent = `Gagal. ID Toko tidak valid.`;
              }
            } catch (dbError: any) {
              this.logger.error(`Database error saat update_store_info: ${dbError.message}`);
              toolResponseContent = `Gagal mengubah profil dari database karena terjadi kesalahan internal.`;
            }

            messages.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: toolCall.function.name,
              content: toolResponseContent,
            });
          } else if (toolCall.type === 'function' && toolCall.function.name === 'update_cs_bot') {
            const { agentName, agentTone, fallbackContact } = args;
            this.logger.log(`[AGENT-ASSISTANT] Mengeksekusi update_cs_bot`);
            
            let toolResponseContent = '';
            try {
              if (tenantId) {
                  const updateData: any = {};
                  if (agentName) {
                      // Sanitasi: Hapus emoji dan karakter aneh, sisakan huruf, angka, spasi, dan dash
                      const cleanName = agentName.replace(/[^\w\s-]/gi, '').trim();
                      updateData.agentName = cleanName.substring(0, 50);
                  }
                  if (agentTone) updateData.agentTone = agentTone;
                  if (fallbackContact) updateData.extraInfo = `[INSTRUKSI KHUSUS CS]: Jika ada pertanyaan yang tidak diketahui jawabannya atau butuh penanganan manusia, arahkan pelanggan untuk menghubungi: ${fallbackContact}`;
                  
                  if (Object.keys(updateData).length > 0) {
                      await this.prisma.tenant.update({
                          where: { id: tenantId },
                          data: updateData
                      });
                      toolResponseContent = `Berhasil mengupdate profil Bot CS.`;
                  } else {
                      toolResponseContent = `Tidak ada profil yang diubah karena parameter kosong.`;
                  }
              } else {
                  toolResponseContent = `Gagal. ID Toko tidak valid.`;
              }
            } catch (dbError: any) {
              this.logger.error(`Database error saat update_cs_bot: ${dbError.message}`);
              toolResponseContent = `Gagal mengubah profil CS dari database karena terjadi kesalahan internal.`;
            }

            messages.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: toolCall.function.name,
              content: toolResponseContent,
            });
          }
        }

        // Panggil OpenAI lagi untuk merangkai jawaban akhir dengan hasil dari tool
        this.logger.log(`[AGENT-ASSISTANT] Mengirim ulang ke OpenAI dengan hasil eksekusi tool...`);
        
        if (onChunk) {
            const streamResponse2 = await this.openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages,
              temperature: 0.7,
              stream: true
            });
            let fullText2 = '';
            for await (const chunk of streamResponse2) {
               const delta = chunk.choices[0]?.delta?.content || '';
               if (delta) {
                  fullText2 += delta;
                  onChunk(delta);
               }
            }
            responseMessage.content = fullText2;
        } else {
            let response = await this.openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages,
              temperature: 0.7,
            });
            responseMessage = response.choices[0].message;
        }
      }

      this.logger.log(`[AGENT-ASSISTANT] Selesai memproses respon OpenAI.`);
      const finalResponse = responseMessage?.content || 'Saya siap membantu Anda, Bos.';
      
      // Catatan: Balasan asisten akan disimpan ke DB oleh telegram.service.ts
      return finalResponse;
    } catch (error) {
      this.logger.error('Error in Owner Assistant AI:', error);
      return 'Terjadi kesalahan saat memproses permintaan Anda.';
    }
  }
}
