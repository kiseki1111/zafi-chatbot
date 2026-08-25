const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedProducts() {
  console.log('Seeding Shoe Store Products...');

  const tenant = await prisma.tenant.findUnique({
    where: { id: '11111111-1111-1111-1111-111111111111' }
  });

  if (!tenant) {
    console.error('Tenant not found. Run seed_sepatu.js first.');
    return;
  }

  const products = [
    {
      id: '55555555-5555-5555-5555-555555555551',
      name: 'Sepatu Sneakers Aerostep V1',
      description: 'Sangat ringan, cocok untuk jogging ringan dan jalan santai harian. Material Mesh Breathable & Sol Karet Anti Slip.',
      price: 350000,
      stock: 120,
      category: 'Sneakers',
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
      tenantId: tenant.id
    },
    {
      id: '55555555-5555-5555-5555-555555555552',
      name: 'Sepatu Formal Oxford Klasik',
      description: 'Desain elegan untuk ngantor atau acara resmi, awet hingga 5 tahun. 100% Kulit Sapi Asli.',
      price: 550000,
      stock: 15,
      category: 'Formal',
      imageUrl: 'https://images.unsplash.com/photo-1614252339474-df31e50085a6',
      tenantId: tenant.id
    },
    {
      id: '55555555-5555-5555-5555-555555555553',
      name: 'Sepatu Lari Marathon Ultra X',
      description: 'Meredam benturan 40% lebih baik, cocok untuk lari jarak jauh di aspal.',
      price: 899000,
      stock: 0,
      category: 'Running',
      imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a',
      tenantId: tenant.id
    },
    {
      id: '55555555-5555-5555-5555-555555555554',
      name: 'Sepatu Boots Gunung TrackMaster',
      description: 'Tahan air (Waterproof), grip kuat untuk medan lumpur dan bebatuan, pelindung jari kaki.',
      price: 720000,
      stock: 45,
      category: 'Outdoor',
      imageUrl: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0',
      tenantId: tenant.id
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      name: 'Sandal Santai Slip-on Comfy',
      description: 'Sangat empuk, anti air, mudah dicuci, cocok untuk dipakai di rumah atau jalan santai.',
      price: 120000,
      stock: 300,
      category: 'Sandal',
      imageUrl: 'https://images.unsplash.com/photo-1603487742131-4160ec999306',
      tenantId: tenant.id
    }
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: product,
      create: product
    });
  }

  console.log('Successfully inserted 5 products to Product table.');
}

seedProducts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
