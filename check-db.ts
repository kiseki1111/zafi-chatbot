import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const knowledges = await prisma.knowledgeBase.findMany({
    select: { id: true, metadata: true, content: true },
  });

  console.log('=== KNOWLEDGE BASE RECORDS ===');
  knowledges.forEach((k, i) => {
    console.log(`\n[${i + 1}] Metadata: ${JSON.stringify(k.metadata)}`);
    console.log(`Preview: ${k.content.substring(0, 150)}...`);
  });
  console.log('==============================');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
