const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe("UPDATE conversations SET instance_name = 'zafi-cs'");
  console.log('Updated conversations to zafi-cs');
}
main().finally(() => prisma.$disconnect());
