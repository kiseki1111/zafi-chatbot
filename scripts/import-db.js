const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  if (!fs.existsSync('database-backup.json')) {
    console.error('database-backup.json not found!');
    return;
  }
  
  console.log('Importing database...');
  const data = JSON.parse(fs.readFileSync('database-backup.json', 'utf8'));

  if (data.users && data.users.length > 0) {
    for (const user of data.users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      });
    }
  }

  if (data.roles && data.roles.length > 0) {
    for (const role of data.roles) {
      await prisma.role.upsert({
        where: { id: role.id },
        update: role,
        create: role,
      });
    }
  }

  if (data.properties && data.properties.length > 0) {
    for (const prop of data.properties) {
      await prisma.property.upsert({
        where: { id: prop.id },
        update: prop,
        create: prop,
      });
    }
  }

  if (data.knowledgeBase && data.knowledgeBase.length > 0) {
    // Clear old knowledge to avoid duplicates
    await prisma.knowledgeBase.deleteMany({});
    for (const kb of data.knowledgeBase) {
      // Embedding vector requires raw insertion
      const embeddingString = kb.embedding ? `[${kb.embedding.join(',')}]` : null;
      if (embeddingString) {
        await prisma.$executeRawUnsafe(
          'INSERT INTO knowledge_base (id, content, embedding, "created_at", "updated_at") VALUES ($1, $2, $3::vector, $4, $5)',
          kb.id, kb.content, embeddingString, kb.createdAt, kb.updatedAt
        );
      } else {
        await prisma.$executeRawUnsafe(
          'INSERT INTO knowledge_base (id, content, "created_at", "updated_at") VALUES ($1, $2, $3, $4)',
          kb.id, kb.content, kb.createdAt, kb.updatedAt
        );
      }
    }
  }

  console.log('Database imported successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
