"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const prisma_service_1 = require("./core/prisma/prisma.service");
const data_agent_service_1 = require("./features/knowledge-ingest/data-agent.service");
const extraKnowledge = `
Data Jawaban
- Syarat umur pengajuan minimal berapa ? Jawab : WNI Umur Minimal 18 Tahun
- Sudah pernah mengambil rumah tetapi mau mengambil rumah subsidi apakah bisa ? Jawab : Syarat utama dari rumah subsidi, belum pernah menerima subsidi rumah dari pemerintah atau belum pernah mengambil rumah komersil (berlaku seumur hidup, sekali seumur hidup)
- Minimal penghasilan untuk pengajuan berapa ? Jawab : Penghasilan minimal 3,2 Juta dan untuk single 8 juta, dan untuk yang sudah menikah penghasilan 4 juta maksimal 11 Juta
- Jika calon konsumen ada hutang minimal harus KOL berapa ? Jawab : SLIK OJK (BI Checking) harus lancar/KOL 1 dan total pinjaman tidak melebihi 40 Juta
- Cicilan rumah subsidi berapa ? Jawab : Cicilan Rumah Subsidi Angsuran Flat tidak ada kenaikan 10 Tahun : Rp. 1.901.400, 15 Tahun : RP. 1.414.500, 20 Tahun : Rp. 1.178.800
- Tanah nya tanah gambut atau tanah keras Jawab : Tanah di Lokasi perumahan adalah tanah keras
- Lokasi rawan banjir? Jawab : Untuk lokasi di perumahan tidak banjir
- Air yang di gunakan di perumahan itu apa ? Jawab : Untuk air nya menggunakan gorong gorong, untuk mendapatkan hasil air yang jernih boleh menggunakan air sumur bor
- Untuk bonus rumah nya apa ? Jawab : Untuk rumah nya ada bonus carport untuk 1 mobil
- Masa retensi/garansi kapan bisa di claim ? Jawab : Untuk masa retensi rumah itu sekitar 1 bulan dari serah terima akad perumahan
- Akses jalan perumahan menggunakan apa ? Jawab : Untuk akses jalan itu menggunakan paving blok
- Legalitas tanah sudah pecah SHM per unit atau masih induk? Jawab : Legalitas tanah udah pecah untuk sertifikat SHM Nya
Data Pertanyaan Konsumen
- Saya kerja freelance/wiraswasta, bisa nggak ajukan subsidi? Jawab : kalau untuk wiraswasta bisa, asal ad SK Kerja & Slip gaji, kalau untuk freelance tidak bisa karena pekerjaan nya dan penghasilan nya tidak tetap
- Gaji saya pas-pasan di batas minimal, apa masih bisa lolos? Jawab : Butuh perhitungan lagi apakah ada pinjaman dan ada tanggungan hidup lain ? kalau ada berapa hutangnya ?
- Kalau saya sudah pernah punya cicilan macet (kredit HP dll), bisa daftar? Jawab : Untuk cicilan macet itu tidak bisa, untuk calon konsumen yang mempunyai pinjaman harus wajib lancar atau KOL 1
- Berapa lama proses dari daftar sampai akad? Jawab : dari berkas masuk sampai akad itu sekitar 1 bulan setengah
- Kalau saya sudah menikah tapi istri juga kerja, penghasilan dihitung gabungan atau sendiri-sendiri? Jawab : untuk penghasilan itu di gabung kalau sudah suami istri, tetapi kalau istri tidak bekerja harus di buatkan surat keterangan tidak bekerja di kantor lurah
- Bisa nggak KPR subsidi tapi minta rumah 2 lantai/renovasi dulu? Jawab : untuk KPR Subsidi minimal sudah lewat dari 5 tahun baru boleh untuk renovasi
- Kalau saya pindah kerja sebelum akad selesai, ngaruh nggak ke pengajuan? Jawab : Selama masih dalam proses pengajuan jangan ada melakukan pinjaman dan mengganti/pindah kerja.
`;
const specs = `
Zafi Residence – Tipe 36 Subsidi
Lokasi: Jl. Ayani - Jl. Parit Sembin, Kabupaten Kuburaya

Harga Cash: Mulai Dari 195 Juta
Admin Fee: 1 Juta

DP + Akad:
BLOK A
- A1 - A3 Luas Tanah (7x22m) = Rp. 14.000.000
- A4 - A26 Luas Tanah (7x22m) = Rp. 10.000.000
- A15 Luas Tanah (8x23m) = Rp. 27.000.000
- A27 Luas Tanah (8x22m) = Rp. 18.000.000

BLOK B
- B1 - B3 Luas Tanah (7x24m) = Rp. 22.000.000
- B4 - B30 Luas Tanah (7x24m) = Rp. 18.000.000
- B31 Luas Tanah (10x24m) = Rp. 14.000.000

Spesifikasi Rumah:
- Tanah Blok A 7 x 22 m, Tanah Blok B 7 x 24 m
- Listrik 1300 Watt
- 2 Kamar Tidur, 1 Kamar Mandi, Teras Depan
- Pondasi Setinggi 50 cm
- Keramik Ukuran 40x40 cm
- Kusen & Daun Pintu Kayu, Kusen & Daun Jendela Kayu
- Rangka Atap Kayu, Atap Genteng Metal

Fasilitas Perumahan: Carport, Fasilitas Umum, Sistem Drainase Baik, Jalan Kompleks Lebar 6 Meter
Estimasi Cicilan : 10 Tahun = Rp. 1.901.400, 15 Tahun = Rp. 1.414.500, 20 Tahun = Rp. 1.178.800
`;
async function bootstrap() {
    console.log('Bootstrapping Zafi Residence Data...');
    process.env.TELEGRAM_BOT_CS_API = '';
    process.env.TELEGRAM_BOT_ONBOARDING_API = '';
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, { logger: false });
    const prisma = app.get(prisma_service_1.PrismaService);
    const dataAgent = app.get(data_agent_service_1.DataAgentService);
    let tenant = await prisma.tenant.findFirst({ where: { name: 'Zafi Residence' } });
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: 'Zafi Residence',
                category: 'Properti / Perumahan',
                description: 'Perumahan Subsidi Tipe 36 di Kabupaten Kuburaya',
                address: 'Jl. Ayani - Jl. Parit Sembin, Kabupaten Kuburaya',
                phone: '08123456789',
                operatingHours: 'Senin - Minggu 08.00 - 17.00',
                isOnboarded: true,
            }
        });
    }
    else {
        await prisma.product.deleteMany({ where: { tenantId: tenant.id } });
        await prisma.knowledgeBase.deleteMany({ where: { tenantId: tenant.id } });
    }
    await prisma.product.create({
        data: {
            name: 'Rumah Tipe 36 Subsidi (Blok A)',
            description: 'Luas Tanah 7x22m atau 8x22m. Listrik 1300 Watt, 2 KT, 1 KM.',
            price: 195000000,
            stock: 27,
            category: 'Properti',
            tenantId: tenant.id
        }
    });
    await prisma.product.create({
        data: {
            name: 'Rumah Tipe 36 Subsidi (Blok B)',
            description: 'Luas Tanah 7x24m atau 10x24m. Listrik 1300 Watt, 2 KT, 1 KM.',
            price: 195000000,
            stock: 31,
            category: 'Properti',
            tenantId: tenant.id
        }
    });
    await prisma.knowledgeBase.create({
        data: {
            content: extraKnowledge,
            tenantId: tenant.id,
            metadata: { title: 'QnA dan Regulasi' }
        }
    });
    await prisma.knowledgeBase.create({
        data: {
            content: specs,
            tenantId: tenant.id,
            metadata: { title: 'Spesifikasi, Harga, dan Promo' }
        }
    });
    console.log('Knowledge Base records inserted. Now syncing vectors...');
    await dataAgent.syncKnowledgeBase(tenant.id);
    console.log('✅ Zafi Residence Seed Completed!');
    await app.close();
}
bootstrap().catch(console.error);
//# sourceMappingURL=seed-zafi.js.map