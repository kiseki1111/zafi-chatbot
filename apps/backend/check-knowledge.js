const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.vectorKnowledge.findMany();
  console.log("VectorKnowledge rows:", result.length);
  result.forEach(r => console.log(r.id, r.title, r.tenantId));
}
main().finally(() => prisma.$disconnect());
