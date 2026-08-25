const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findFirst({
    where: {
      name: { contains: 'Aerostep', mode: 'insensitive' }
    }
  });

  if (product) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        attributes: {
          variants: {
            "39": 5,
            "40": 10,
            "41": 15,
            "42": 8
          }
        },
        stock: 38 // 5+10+15+8
      }
    });
    console.log(`Berhasil menambahkan varian ke produk: ${product.name}`);
  } else {
    console.log('Produk Aerostep tidak ditemukan.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
