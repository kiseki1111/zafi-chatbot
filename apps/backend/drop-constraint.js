const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe('ALTER TABLE messages DROP CONSTRAINT messages_conversation_id_fkey');
  console.log('Constraint dropped');
}
main().finally(() => prisma.$disconnect());
