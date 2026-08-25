const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.knowledgeBase.deleteMany({});
  console.log('Deleted rows:', result.count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
