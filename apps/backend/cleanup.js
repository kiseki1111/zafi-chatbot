const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('Cleaning up data...');
  
  // 1. Delete products from knowledge_base
  const kbResult = await prisma.knowledgeBase.deleteMany({
    where: {
      content: {
        contains: '[Kategori: PRODUK]'
      }
    }
  });
  console.log(`Deleted ${kbResult.count} product entries from knowledge_base.`);

  // 2. Delete products from Product table that are not shoes
  // Our shoe store products were: 'Sepatu Sneakers Aerostep V1', 'Sepatu Formal Oxford Klasik', 'Sepatu Lari Marathon Ultra X', 'Sepatu Boots Gunung TrackMaster', 'Sandal Santai Slip-on Comfy'
  // I will delete all products that don't contain 'sepatu' or 'sandal'
  const pResult = await prisma.product.deleteMany({
    where: {
      NOT: {
        OR: [
          { name: { contains: 'sepatu', mode: 'insensitive' } },
          { name: { contains: 'sandal', mode: 'insensitive' } }
        ]
      }
    }
  });
  console.log(`Deleted ${pResult.count} non-shoe products from Product table.`);
}

cleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
