const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.$queryRawUnsafe('SELECT COUNT(*) FROM conversations');
  console.log('conversations:', count);
}
main().finally(() => prisma.$disconnect());
