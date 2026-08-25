const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.knowledgeBase.findMany();
  console.log("KnowledgeBase rows:", result.length);
}
main().finally(() => prisma.$disconnect());
