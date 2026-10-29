const fs = require('fs');
const path = require('path');
const { PrismaClient } = require(path.resolve(process.cwd(), 'apps/backend/node_modules/@prisma/client'));

let dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:secret_password@127.0.0.1:5432/rbac_api_db?schema=public';
if (dbUrl.includes('@postgres:5432')) {
  dbUrl = dbUrl.replace('@postgres:5432', '@127.0.0.1:5432');
}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

async function seed() {
  console.log('🏗️ Mempersiapkan data cluster Zafi Residence sesuai denah asli...');

  // 1. Temukan tenant Zafi Properti Land
  let tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ name: 'Zafi Properti Land' }, { name: { contains: 'Zafi' } }],
    },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Zafi Properti Land',
        category: 'properti',
        phone: '6285168768994',
        address: 'Jl. Raya Grand Harmoni No. 8, Jawa Barat',
        agentName: 'Zafi AI Properti',
      },
    });
  }

  console.log(`   ✓ Menggunakan Tenant: "${tenant.name}" (${tenant.id})`);

  // 2. Cari atau buat group ResourceGroup: Zafi Residence
  let group = await prisma.resourceGroup.findFirst({
    where: {
      tenantId: tenant.id,
      name: { contains: 'Zafi Residence', mode: 'insensitive' },
    },
  });

  if (!group) {
    group = await prisma.resourceGroup.create({
      data: {
        tenantId: tenant.id,
        name: 'Zafi Residence',
        category: 'properti',
        description: 'Perumahan komersil modern Zafi Residence. Tersedia pilihan Tipe 36/72 dan Tipe 45/90 dengan fasilitas lengkap jalan komplek paving block, fasos, dan akses strategis.',
        pricingTemplates: [
          {
            houseType: '36/72',
            landArea: '72 m²',
            buildingType: 'Tipe 36',
            buildingPrice: 198000000,
            packagePrice: 245000000,
          },
        ],
      },
    });
  }

  console.log(`   ✓ Cluster Group: "${group.name}" (${group.id})`);

  // 3. Masukkan unit kavling Blok A (A1 s/d A27) & Blok B (B1 s/d B31) persis seperti Image 2
  const unitsData = [];

  // Blok A: A1 - A27
  for (let i = 1; i <= 27; i++) {
    const code = `A${i}`;
    let status = 'BOOKED'; // Default: Proses Bank
    let notes = 'Unit Proses Bank';

    if (i === 2) {
      status = 'AVAILABLE';
      notes = 'Konsumen Cash';
    } else if (i >= 23 && i <= 25) {
      status = 'AVAILABLE';
      notes = 'Unit Ready';
    }

    unitsData.push({
      groupId: group.id,
      code,
      name: `Kavling ${code}`,
      propertyType: 'BANGUNAN',
      houseType: '36/72',
      status,
      price: 245000000,
      notes,
    });
  }

  // Blok B: B1 - B31
  for (let i = 1; i <= 31; i++) {
    const code = `B${i}`;
    let status = 'BOOKED'; // Default: Proses Bank
    let notes = 'Unit Proses Bank';

    if ((i >= 9 && i <= 12) || i === 14 || i >= 19) {
      status = 'AVAILABLE';
      notes = 'Unit Ready';
    }

    unitsData.push({
      groupId: group.id,
      code,
      name: `Kavling ${code}`,
      propertyType: 'BANGUNAN',
      houseType: '36/72',
      status,
      price: 245000000,
      notes,
    });
  }

  console.log(`   ✓ Menyiapkan ${unitsData.length} unit kavling Blok A & Blok B...`);

  for (const item of unitsData) {
    await prisma.resourceItem.upsert({
      where: {
        groupId_code: {
          groupId: group.id,
          code: item.code,
        },
      },
      update: {
        status: item.status,
        notes: item.notes,
        houseType: item.houseType,
        price: item.price,
      },
      create: item,
    });
  }

  console.log(`   ✓ Seluruh 58 unit kavling berhasil disinkronkan ke database!\n`);
  return group;
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { seed };
