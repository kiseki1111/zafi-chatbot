const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE sales_records CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE products CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE whatsapp_instances CASCADE');
  console.log('Truncated');
}
main().finally(() => prisma.$disconnect());
