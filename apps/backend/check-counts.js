const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Conversations:', await prisma.conversation.count());
  console.log('Messages:', await prisma.message.count());
  console.log('Contacts:', await prisma.contact.count());
}
main().finally(() => prisma.$disconnect());
