"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const ai_service_1 = require("./modules/ai/ai.service");
const prisma_service_1 = require("./infrastructure/prisma/prisma.service");
async function runTests() {
    process.env.TELEGRAM_BOT_CS_API = '';
    process.env.TELEGRAM_BOT_ONBOARDING_API = '';
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, { logger: false });
    const aiService = app.get(ai_service_1.AiService);
    const prisma = app.get(prisma_service_1.PrismaService);
    const tenant = await prisma.tenant.findFirst();
    const tenantId = tenant?.id;
    const testCases = [
        { cat: '1. Akurasi', q: 'Berapa harga cash Zafi Residence?' },
        { cat: '1. Akurasi', q: 'Cicilan Zafi Residence 20 tahun berapa?' },
        { cat: '2. Syarat', q: 'Saya sudah pernah beli rumah komersil, bisa ambil subsidi?' },
        { cat: '2. Syarat', q: 'Saya ada hutang, KOL berapa yang diterima?' },
        { cat: '3. Situasi', q: 'Saya kerja freelance, bisa ajukan subsidi nggak?' },
        { cat: '4. Batasan', q: 'Harga emas hari ini berapa?' },
        { cat: '5. Gambar', q: 'Minta foto Zafi Residence dong' },
        { cat: '6. Gaya', q: 'Halo kak, mau tanya-tanya rumah dong' },
        { cat: '8. Stress', q: 'asdfghjkl' }
    ];
    console.log('🧪 MEMULAI PENGUJIAN BOT LUNA (SAMPLE)...\n');
    for (const t of testCases) {
        console.log(`\n[${t.cat}] Q: ${t.q}`);
        try {
            const response = await aiService.generateLunaResponse(t.q, 'test-user', [], tenantId);
            console.log(`A: ${response}`);
        }
        catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
        }
    }
    console.log('\n\n🧪 PENGUJIAN MULTI-TURN...');
    const chatHistory = [];
    const q1 = 'Saya tertarik dengan Seven Residence';
    console.log(`\n[7. Multi-Turn 1] Q: ${q1}`);
    let response = await aiService.generateLunaResponse(q1, 'test-user', chatHistory, tenantId);
    console.log(`A: ${response}`);
    chatHistory.push({ senderType: 'user', content: q1 });
    chatHistory.push({ senderType: 'bot', content: response });
    const q2 = 'Berapa cicilannya untuk 15 tahun?';
    console.log(`\n[7. Multi-Turn 2] Q: ${q2}`);
    response = await aiService.generateLunaResponse(q2, 'test-user', chatHistory, tenantId);
    console.log(`A: ${response}`);
    await app.close();
    process.exit(0);
}
runTests().catch(console.error);
//# sourceMappingURL=test-bot.js.map