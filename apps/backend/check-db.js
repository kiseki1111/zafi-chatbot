const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('VectorKnowledge DOCX:');
  const v = await prisma.vectorKnowledge.findMany({
    where: { title: { contains: 'docx' } }
  });
  console.log(v.map(i => ({ id: i.id, title: i.title })));

  console.log('\nKnowledgeBase:');
  const kb = await prisma.knowledgeBase.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(kb.map(i => ({ id: i.id, metadata: i.metadata })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
