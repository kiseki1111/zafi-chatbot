import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AiService } from './modules/ai/ai.service';
import { PrismaService } from './infrastructure/prisma/prisma.service';

async function bootstrap() {
  process.env.TELEGRAM_BOT_CS_API = '';
  process.env.TELEGRAM_BOT_ONBOARDING_API = '';

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const aiService = app.get(AiService);
  const prisma = app.get(PrismaService);

  const tenant = await prisma.tenant.findFirst({ where: { name: 'Zafi Residence' } });
  if (!tenant) throw new Error("Tenant Zafi Residence tidak ditemukan");
  const tenantId = tenant.id;

  const testCases = [
    { q: "Harganya masih bisa kurang nggak kak? 180 juta deh cash besok", cat: "Negosiasi" },
    { q: "Aduh kak, saya bingung mending ambil Griya Amanah Tipe 40 atau Kahyana ya?", cat: "Keraguan" },
    { q: "Gajiku cuma UMR 3,2 juta, istri ga kerja, cicilan sejuta tuh berat ga sih kak menurut kakak?", cat: "Empati" },
    { q: "Kok syarat subsidinya ribet banget sih kak? Masa ga boleh punya utang sama sekali", cat: "Keluhan" },
    { q: "Kemarin tetangga saya beli di developer sebelah bisa tuh pake slip gaji palsu, masa di sini ga bisa?", cat: "Integritas" },
    { q: "Bg rmh zafi yg 36 dmn lok ny?", cat: "Bahasa Gaul" },
    { q: "CEPET BALAS DONG SAYA MAU SURVEI SEKARANG!!!", cat: "Desakan" },
    { q: "Sedih kak, pengajuan KPR ku yang dulu ditolak gara-gara telat bayar shopee paylater :( Kira-kira di sini bakal ditolak lagi ga ya?", cat: "Curhat Pinjol" },
  ];

  console.log('\n\n🧪 MEMULAI PENGUJIAN PERILAKU BOT LUNA...\n\n');

  for (const tc of testCases) {
    try {
      const response = await aiService.generateLunaResponse(tc.q, '12345', [], tenantId);
      console.log(`[${tc.cat}] Q: ${tc.q}`);
      console.log(`A: ${response}\n`);
    } catch (err) {
      console.error(`[ERROR pada ${tc.cat}]: ${err.message}\n`);
    }
  }

  // UJI MULTI-TURN BEHAVIOR
  console.log('🧪 PENGUJIAN MULTI-TURN TRANSISI MENDADAK...\n');
  const chatHistory: any[] = [];
  
  const q1 = "Seven residence tipe 45 berapa kak harganya?";
  const r1 = await aiService.generateLunaResponse(q1, '12345', chatHistory, tenantId);
  console.log(`[M-Turn 1] Q: ${q1}\nA: ${r1}\n`);
  chatHistory.push({ senderType: 'user', content: q1 });
  chatHistory.push({ senderType: 'bot', content: r1 });

  const q2 = "Waduh mahal juga ya. Gajiku ga cukup kayaknya";
  const r2 = await aiService.generateLunaResponse(q2, '12345', chatHistory, tenantId);
  console.log(`[M-Turn 2] Q: ${q2}\nA: ${r2}\n`);
  chatHistory.push({ senderType: 'user', content: q2 });
  chatHistory.push({ senderType: 'bot', content: r2 });

  const q3 = "Kalo yg Zafi Blok B dp nya berapa tuh?";
  const r3 = await aiService.generateLunaResponse(q3, '12345', chatHistory, tenantId);
  console.log(`[M-Turn 3] Q: ${q3}\nA: ${r3}\n`);
  chatHistory.push({ senderType: 'user', content: q3 });
  chatHistory.push({ senderType: 'bot', content: r3 });

  const q4 = "Eh tapi lokasinya Seven Residence di mana sih tadi lupa nanya";
  const r4 = await aiService.generateLunaResponse(q4, '12345', chatHistory, tenantId);
  console.log(`[M-Turn 4] Q: ${q4}\nA: ${r4}\n`);

  await app.close();
}

bootstrap().catch(console.error);
