import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OnboardingState } from './onboarding-states';
import { OPENAI_CLIENT } from '../../infrastructure/openai/openai.module';
import { OpenAI } from 'openai';
import { DataAgentService } from '../knowledge/data-agent.service';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  private openai: OpenAI | null;

  constructor(
    private prisma: PrismaService,
    @Inject(OPENAI_CLIENT) private injectedOpenai: OpenAI | null,
    @Inject(forwardRef(() => DataAgentService)) private dataAgentService: DataAgentService
  ) {
    this.openai = this.injectedOpenai;
  }

  async handleMessage(chatId: string, text: string, session: any, sendMessageFn: (chatId: string, text: string) => Promise<void>) {
    if (!this.openai) {
      this.logger.error('OpenAI client not available');
      return;
    }

    try {
      // 1. Prepare current state
      const currentData = typeof session.data === 'string' ? JSON.parse(session.data) : session.data;
      const currentStateObj = Object.keys(currentData).length === 0 ? {
        store: {},
        products: [],
        extraKnowledge: "",
        internalStatus: "NEED_STORE_INFO"
      } : currentData;

      // 2. Call OpenAI Evaluator
      const systemPrompt = `Anda adalah sistem Onboarding AI. Tugas Anda mengekstrak informasi toko dan produk dari pesan pengguna, memperbaiki ejaan, dan menentukan status percakapan.

ATURAN STRUKTUR DATA (WAJIB DIPATUHI, FORMAT JSON STRICT):
{
  "updatedData": {
    "store": {
       "name": "string",
       "category": "string",
       "address": "string",
       "phone": "string",
       "operatingHours": "string",
       "paymentMethods": "string (GABUNGKAN JADI STRING, JANGAN ARRAY)",
       "shippingMethods": "string (GABUNGKAN JADI STRING, JANGAN ARRAY)",
       "returnPolicy": "string",
       "currentPromo": "string"
    },
    "products": [
      { "name": "string", "description": "string", "price": 0, "stock": 0 }
    ],
    "extraKnowledge": "string (Gabungkan semua informasi tambahan regulasi/proses pembelian yang relevan dengan toko ini menjadi teks paragraf panjang)"
  },
  "replyMessage": "string (Pesan ramah untuk dikirim ke pengguna)",
  "internalStatus": "NEED_STORE_INFO | NEED_PRODUCTS | NEED_EXTRA_KNOWLEDGE | READY_FOR_REVIEW | COMPLETED"
}

LOGIKA EVALUASI (internalStatus):
1. Jika info toko dasar (name, category, address, phone) ada yang kosong -> "NEED_STORE_INFO"
2. Jika info toko lengkap, TAPI products kosong -> "NEED_PRODUCTS"
3. Jika produk sudah ada (minimal 1), TAPI extraKnowledge kosong -> "NEED_EXTRA_KNOWLEDGE"
4. JIKA SEMUA DATA (toko, produk, extraKnowledge) SUDAH DIKIRIMKAN SEKALIGUS OLEH USER, LANGSUNG LOMPAT KE STATUS -> "READY_FOR_REVIEW". JANGAN meminta input satu-persatu jika data sudah lengkap.
5. Jika di status READY_FOR_REVIEW user menjawab "ya", "setuju", "benar", "lanjut" -> "COMPLETED"

PANDUAN MEMBUAT replyMessage:
- Jika NEED_STORE_INFO: Minta secara ramah bagian yang kosong.
- Jika NEED_PRODUCTS: Minta user memasukkan produk (bisa diketik sekaligus).
- Jika NEED_EXTRA_KNOWLEDGE: Ini yang paling cerdas. Berdasarkan "category" toko dan "products", tanyakan 1-2 hal ekstra. Misal untuk properti: "Bagaimana alur pembelian atau regulasi KPR-nya?". Untuk Fashion: "Apakah ada size chart atau kebijakan retur?". Gali informasi spesifik tokonya.
- Jika READY_FOR_REVIEW: Tampilkan rangkuman rapi dan tanya apakah sudah benar.
- Jika COMPLETED: Ucapkan selamat bahwa bot sudah siap.

PENTING: Selalu pastikan field seperti paymentMethods di store adalah STRING (misal: "Cash, KPR"), BUKAN array. Gabungkan jika user memberi list.

DATA SAAT INI (GABUNGKAN DENGAN INPUT BARU):
${JSON.stringify(currentStateObj)}
`;

      this.logger.log(`Calling AI Evaluator for ${chatId}...`);
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        response_format: { type: 'json_object' }
      });

      const jsonStr = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(jsonStr);

      const updatedData = parsed.updatedData;
      const replyMessage = parsed.replyMessage;
      const internalStatus = parsed.internalStatus;

      // Update session data based on internal status
      updatedData.internalStatus = internalStatus;
      
      await this.prisma.onboardingSession.update({
        where: { id: session.id },
        data: { 
          data: updatedData,
          state: internalStatus === 'COMPLETED' ? OnboardingState.COMPLETED : OnboardingState.IN_PROGRESS
        }
      });

      await sendMessageFn(chatId, replyMessage);

      // If completed, finalize!
      if (internalStatus === 'COMPLETED') {
        await this.finalizeOnboarding(session.id, updatedData);
      }

    } catch (e) {
      this.logger.error(`Error in adaptive onboarding process: ${e.message}`);
      await sendMessageFn(chatId, 'Maaf, saya tidak bisa memproses informasi tersebut. Bisa tolong ulangi dengan kata lain?');
    }
  }

  private async finalizeOnboarding(sessionId: string, data: any) {
    this.logger.log(`Finalizing onboarding for session ${sessionId}`);
    try {
      const store = data.store || {};
      const products = data.products || [];
      const extraKnowledge = data.extraKnowledge;

      // Create tenant
      const tenant = await this.prisma.tenant.create({
        data: {
          name: typeof store.name === 'string' ? store.name : 'Toko Baru',
          category: typeof store.category === 'string' ? store.category : null,
          description: typeof store.description === 'string' ? store.description : null,
          address: typeof store.address === 'string' ? store.address : null,
          phone: typeof store.phone === 'string' ? store.phone : null,
          operatingHours: typeof store.operatingHours === 'string' ? store.operatingHours : null,
          paymentMethods: typeof store.paymentMethods === 'string' ? store.paymentMethods : 
                          (Array.isArray(store.paymentMethods) ? store.paymentMethods.join(', ') : null),
          shippingMethods: typeof store.shippingMethods === 'string' ? store.shippingMethods : 
                           (Array.isArray(store.shippingMethods) ? store.shippingMethods.join(', ') : null),
          returnPolicy: typeof store.returnPolicy === 'string' ? store.returnPolicy : null,
          currentPromo: typeof store.currentPromo === 'string' ? store.currentPromo : null,
          isOnboarded: true,
        }
      });

      // Save products
      for (const p of products) {
        await this.prisma.product.create({
          data: {
            name: typeof p.name === 'string' ? p.name : 'Produk',
            description: typeof p.description === 'string' ? p.description : '',
            price: Number(p.price) || 0,
            stock: Number(p.stock) || 0,
            category: typeof p.category === 'string' ? p.category : 'UMUM',
            tenantId: tenant.id
          }
        });
      }

      // Save extra knowledge
      if (extraKnowledge && typeof extraKnowledge === 'string') {
        await this.prisma.knowledgeBase.create({
          data: {
            content: extraKnowledge,
            tenantId: tenant.id,
            metadata: { title: "Informasi Khusus Toko" }
          }
        });
      }

      // Mark session completed and attach tenant
      await this.prisma.onboardingSession.update({
        where: { id: sessionId },
        data: { tenantId: tenant.id }
      });

      // Trigger sync for VectorKnowledge
      await this.dataAgentService.syncKnowledgeBase(tenant.id);
      
      this.logger.log(`Onboarding finalized successfully for Tenant ID: ${tenant.id}`);
    } catch(e) {
      this.logger.error("Error finalizing onboarding: " + e.message);
    }
  }
}
