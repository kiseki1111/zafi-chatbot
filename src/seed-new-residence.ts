import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { DataAgentService } from './modules/knowledge/data-agent.service';
import { Logger } from '@nestjs/common';

const griyaAmanah40 = `
Griya Amanah 2 – Tipe 40
Lokasi: Jl. Berdikari - Jl. Bukit Batu 2, Pal V, Pontianak Barat

Harga Cash: 295 Juta
Admin Fee: 5 Juta
DP: 40 Juta

Spesifikasi Rumah:
- Tanah 8 x 16 m
- Listrik 1300 Watt
- 2 Kamar Tidur, 1 Kamar Mandi, Teras Depan
- Pondasi Setinggi 50 cm
- Keramik Ukuran 40x40 cm
- Kusen & Daun Pintu Kayu, Kusen & Daun Jendela Kayu
- Rangka Atap Baja Ringan, Atap Genteng Metal

Fasilitas Perumahan: Carport, Fasilitas Umum, Sistem Drainase Baik, Jalan Kompleks Lebar 7 Meter

Estimasi Cicilan BSN:
15 Tahun (Plafon 250 Juta)
- Tahun 1: 2,108,292 | Tahun 2: 2,316,110 | Tahun 3: 2,684,984 | Tahun 4: 3,079,678 | Tahun 5-Lunas: 3,161,461
20 Tahun (Plafon 250 Juta)
- Tahun 1: 1,789,636 | Tahun 2: 2,012,455 | Tahun 3: 2,410,898 | Tahun 4: 2,838,589 | Tahun 5-Lunas: 2,927,158

Estimasi Cicilan BSI:
- Tenor 15 Tahun: 2,671,239 / Bulan Flat
`;

const griyaAmanah45 = `
Griya Amanah 2 – Tipe 45
Lokasi: Jl. Berdikari - Jl. Bukit Batu 2, Pal V, Pontianak Barat

Harga Cash: 330 Juta
Admin Fee: 5 Juta
DP: 45 Juta

Spesifikasi Rumah:
- Tanah 9 x 16 m
- Listrik 1300 Watt Up To 2200 Watt
- 2 Kamar Tidur, 1 Kamar Mandi, Teras Depan
- Pondasi Setinggi 50 cm
- Keramik Ukuran 60x60 cm
- Kusen & Daun Pintu Kayu, Kusen & Daun Jendela Kayu
- Rangka Atap Baja Ringan, Atap Genteng Metal

Fasilitas Perumahan: Carport, Fasilitas Umum, Sistem Drainase Baik, Jalan Kompleks Lebar 7 Meter

Estimasi Cicilan BSN:
15 Tahun (Plafon 280 Juta)
- Tahun 1: 2,361,287 | Tahun 2: 2,594,044 | Tahun 3: 3,007,182 | Tahun 4: 3,449,240 | Tahun 5-Lunas: 3,540,836
20 Tahun (Plafon 280 Juta)
- Tahun 1: 2,004,392 | Tahun 2: 2,253,949 | Tahun 3: 2,700,206 | Tahun 4: 3,179,220 | Tahun 5-Lunas: 3,278,417

Estimasi Cicilan BSI:
- Tenor 15 Tahun: 2,991,788 / Bulan Flat
`;

const sevenResidence = `
Seven Residence – Tipe 45
Lokasi: Jl. Parit Haji Muhsin II, Gg. Abdul Karim

Harga Cash: 375 Juta (Cash Keras)
Admin Fee: 6 Juta
DP: 50 Juta

Spesifikasi Rumah:
- Tanah 8 x 20 m
- Air PDAM, Listrik 1300 Watt
- 2 Kamar Tidur, 1 Kamar Mandi, Teras Depan
- Pondasi Setinggi 50 cm, Keramik Ukuran 40x40 cm
- Kusen & Daun Pintu Kayu Bengkirai, Kusen & Daun Jendela Kayu Bengkirai
- Rangka Atap Baja Ringan, Atap Genteng Metal

Fasilitas Perumahan: Carport, Sistem Drainase Baik, Jalan Kompleks Lebar 6 Meter

Estimasi Cicilan BSN:
15 Tahun (Plafon 319 juta)
- Tahun 1: 2.690.179 | Tahun 2: 2.955.357 | Tahun 3: 3.426.039 | Tahun 4: 3.929.670 | Tahun 5-Lunas: 4.034.024
20 Tahun (Plafon 319 juta)
- Tahun 1: 2.283.576 | Tahun 2: 2.567.892 | Tahun 3: 3.076.304 | Tahun 4: 3.622.040 | Tahun 5-Lunas: 3.735.055

Estimasi Cicilan BSI:
- Tenor 15 Tahun: 3.408.460 / bulan Flat
`;

const kahyanaResidence = `
Kahyana Residence – Tipe 36 Subsidi
Lokasi: Jl. Usaha Baru - Parit langgar, Kabupaten Kuburaya

Harga Cash: 195 Juta (Cash Keras) | 205 Juta (Cash Tempo)
DP + Akad: 1 Juta (Di Luar angsuran mengendap)

Spesifikasi Rumah:
- Tanah 7 x 22 - 24 m
- Listrik 1300 Watt
- 2 Kamar Tidur, 1 Kamar Mandi, Teras Depan
- Pondasi Setinggi 50 cm, Keramik Ukuran 40x40 cm
- Kusen & Daun Pintu Kayu, Kusen & Daun Jendela Kayu
- Rangka Atap Kayu, Atap Genteng

Fasilitas Perumahan: Carport, Fasilitas Umum, Sistem Drainase Baik, Jalan Kompleks Lebar 6 Meter

Estimasi Cicilan:
- 10 Tahun = Rp. 1.901.400
- 15 Tahun = Rp. 1.414.500
- 20 Tahun = Rp. 1.178.800
`;

async function bootstrap() {
  const logger = new Logger('SeedNewResidence');
  logger.log('Bootstrapping New Residences Data...');
  
  // Disable Telegram bots to prevent polling conflict during seed
  process.env.TELEGRAM_BOT_CS_API = '';
  process.env.TELEGRAM_BOT_ONBOARDING_API = '';
  
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);
  const dataAgent = app.get(DataAgentService);

  // 1. Get existing Tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    logger.error('No tenant found to attach new products.');
    process.exit(1);
  }

  // 2. Insert Products
  const productsToInsert = [
    { name: 'Griya Amanah 2 - Tipe 40', price: 295000000 },
    { name: 'Griya Amanah 2 - Tipe 45', price: 330000000 },
    { name: 'Seven Residence - Tipe 45', price: 375000000 },
    { name: 'Kahyana Residence - Tipe 36 Subsidi', price: 195000000 },
  ];

  for (const p of productsToInsert) {
    const exists = await prisma.product.findFirst({ where: { name: p.name, tenantId: tenant.id } });
    if (!exists) {
      await prisma.product.create({
        data: {
          name: p.name,
          description: 'Spesifikasi detail ada di Knowledge Base',
          price: p.price,
          stock: 10,
          category: 'Properti',
          tenantId: tenant.id
        }
      });
      logger.log(`Inserted Product: ${p.name}`);
    }
  }

  // 3. Insert Knowledge Base
  const knowledges = [
    { title: 'Spesifikasi Griya Amanah 2 Tipe 40', content: griyaAmanah40 },
    { title: 'Spesifikasi Griya Amanah 2 Tipe 45', content: griyaAmanah45 },
    { title: 'Spesifikasi Seven Residence Tipe 45', content: sevenResidence },
    { title: 'Spesifikasi Kahyana Residence Tipe 36', content: kahyanaResidence },
  ];

  for (const k of knowledges) {
    await prisma.knowledgeBase.create({
      data: {
        content: k.content,
        tenantId: tenant.id,
        metadata: { title: k.title }
      }
    });
    logger.log(`Inserted Knowledge Base: ${k.title}`);
  }

  logger.log('Knowledge Base records inserted. Now syncing vectors (this may take a minute)...');
  
  // 4. Vectorize Knowledge
  await dataAgent.syncKnowledgeBase(tenant.id);

  logger.log('✅ New Residence Seed Completed!');
  await app.close();
  process.exit(0);
}

bootstrap().catch(e => {
  console.error(e);
  process.exit(1);
});
