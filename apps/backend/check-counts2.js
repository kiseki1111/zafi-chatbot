const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.conversation.count();
  const m = await prisma.message.count();
  console.log('Conversations:', c);
  console.log('Messages:', m);
}
main().finally(() => prisma.$disconnect());
