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
    { q: "Ada perumahan apa aja kak yang dijual?", cat: "Katalog" },
    { q: "Tolong sebutkan semua produk kalian dong", cat: "Katalog" },
    { q: "Zafi residence cicilannya berapa?", cat: "Spesifik" },
  ];

  console.log('\n\n🧪 MEMULAI PENGUJIAN ADAPTIVE RAG (INTENT ROUTING)...\n\n');

  for (const tc of testCases) {
    try {
      const response = await aiService.generateLunaResponse(tc.q, '12345', [], tenantId);
      console.log(`[${tc.cat}] Q: ${tc.q}`);
      console.log(`A: ${response}\n`);
    } catch (err) {
      console.error(`[ERROR pada ${tc.cat}]: ${err.message}\n`);
    }
  }

  await app.close();
}

bootstrap().catch(console.error);
