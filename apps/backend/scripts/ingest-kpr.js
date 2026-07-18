const { PrismaClient } = require('@prisma/client');
const { OpenAI } = require('openai');
const fs = require('fs');
require('dotenv').config();

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY });

async function main() {
  const text = fs.readFileSync('knowledge_base/kpr.txt', 'utf8');
  const chunks = text.split(/\r?\n\r?\n/).filter(c => c.trim().length > 0);
  console.log('Found', chunks.length, 'chunks.');
  
  for (const chunk of chunks) {
    const finalContext = '[Kategori: KPR BSN] ' + chunk.trim();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: finalContext,
    });
    const embedding = response.data[0].embedding;
    const embeddingString = '[' + embedding.join(',') + ']';
    
    await prisma.$executeRawUnsafe(
      'INSERT INTO knowledge_base (id, content, embedding, "created_at", "updated_at") VALUES (gen_random_uuid(), $1, $2::vector, NOW(), NOW())',
      finalContext,
      embeddingString
    );
  }
  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
