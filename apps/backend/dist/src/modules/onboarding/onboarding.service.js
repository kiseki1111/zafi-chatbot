"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OnboardingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const onboarding_states_1 = require("./onboarding-states");
const openai_module_1 = require("../../core/openai/openai.module");
const data_agent_service_1 = require("../../features/knowledge-ingest/data-agent.service");
let OnboardingService = OnboardingService_1 = class OnboardingService {
    prisma;
    injectedOpenai;
    dataAgentService;
    logger = new common_1.Logger(OnboardingService_1.name);
    openai;
    constructor(prisma, injectedOpenai, dataAgentService) {
        this.prisma = prisma;
        this.injectedOpenai = injectedOpenai;
        this.dataAgentService = dataAgentService;
        this.openai = this.injectedOpenai;
    }
    async handleMessage(chatId, text, session, sendMessageFn) {
        if (!this.openai) {
            this.logger.error('OpenAI client not available');
            return;
        }
        try {
            const currentData = typeof session.data === 'string' ? JSON.parse(session.data) : session.data;
            const currentStateObj = Object.keys(currentData).length === 0 ? {
                store: {},
                products: [],
                extraKnowledge: "",
                internalStatus: "NEED_STORE_INFO"
            } : currentData;
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
            updatedData.internalStatus = internalStatus;
            await this.prisma.onboardingSession.update({
                where: { id: session.id },
                data: {
                    data: updatedData,
                    state: internalStatus === 'COMPLETED' ? onboarding_states_1.OnboardingState.COMPLETED : onboarding_states_1.OnboardingState.IN_PROGRESS
                }
            });
            await sendMessageFn(chatId, replyMessage);
            if (internalStatus === 'COMPLETED') {
                await this.finalizeOnboarding(session.id, updatedData);
            }
        }
        catch (e) {
            this.logger.error(`Error in adaptive onboarding process: ${e.message}`);
            await sendMessageFn(chatId, 'Maaf, saya tidak bisa memproses informasi tersebut. Bisa tolong ulangi dengan kata lain?');
        }
    }
    async finalizeOnboarding(sessionId, data) {
        this.logger.log(`Finalizing onboarding for session ${sessionId}`);
        try {
            const store = data.store || {};
            const products = data.products || [];
            const extraKnowledge = data.extraKnowledge;
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
            if (extraKnowledge && typeof extraKnowledge === 'string') {
                await this.prisma.knowledgeBase.create({
                    data: {
                        content: extraKnowledge,
                        tenantId: tenant.id,
                        metadata: { title: "Informasi Khusus Toko" }
                    }
                });
            }
            await this.prisma.onboardingSession.update({
                where: { id: sessionId },
                data: { tenantId: tenant.id }
            });
            await this.dataAgentService.syncKnowledgeBase(tenant.id);
            this.logger.log(`Onboarding finalized successfully for Tenant ID: ${tenant.id}`);
        }
        catch (e) {
            this.logger.error("Error finalizing onboarding: " + e.message);
        }
    }
};
exports.OnboardingService = OnboardingService;
exports.OnboardingService = OnboardingService = OnboardingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(openai_module_1.OPENAI_CLIENT)),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => data_agent_service_1.DataAgentService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object, data_agent_service_1.DataAgentService])
], OnboardingService);
//# sourceMappingURL=onboarding.service.js.map