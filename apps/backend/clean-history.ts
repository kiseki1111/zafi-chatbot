import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Hapus SEMUA pesan bot yang mengandung halusinasi
  const r1 = await prisma.message.deleteMany({
    where: { content: { contains: 'example.com' } }
  });
  const r2 = await prisma.message.deleteMany({
    where: { content: { contains: 'Link Gambar' } }
  });
  console.log(`Deleted ${r1.count + r2.count} poisoned messages`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
