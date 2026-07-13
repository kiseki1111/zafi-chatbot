import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.CHATGPT_API_KEY,
});

async function main() {
  console.log('Reading knowledge_base/kpr.txt...');
  const text = fs.readFileSync('knowledge_base/kpr.txt', 'utf8');
  
  // Split by double newlines to get logical chunks/paragraphs
  const chunks = text.split(/\r?\n\r?\n/).filter(c => c.trim().length > 0);
  
  console.log(`Found ${chunks.length} chunks to ingest.`);
  
  for (const chunk of chunks) {
    const finalContext = `[Kategori: KPR BSN] ${chunk.trim()}`;
    console.log('Generating embedding for:', finalContext.substring(0, 50) + '...');
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: finalContext,
    });
    
    const embedding = response.data[0].embedding;
    const embeddingString = `[${embedding.join(',')}]`;
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO knowledge_base (id, content, embedding, "created_at", "updated_at")
      VALUES (gen_random_uuid(), $1, $2::vector, NOW(), NOW())
    `, finalContext, embeddingString);
    
    console.log('Inserted chunk into DB.');
  }
  
  console.log('Ingestion completed successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
