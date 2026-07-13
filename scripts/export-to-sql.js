const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

function escapeValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return val;
  // Handle string, replace single quotes with two single quotes for SQL escaping
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function main() {
  console.log('Generating database-backup.sql...');
  let sql = '-- PostgreSQL Database Backup\n-- Generated via Node.js Script\n\n';

  // 1. Export Users
  const users = await prisma.user.findMany();
  if (users.length > 0) {
    sql += '-- Table: users\n';
    for (const u of users) {
      const cols = Object.keys(u).map(k => `"${k}"`).join(', ');
      const vals = Object.values(u).map(escapeValue).join(', ');
      sql += `INSERT INTO "users" (${cols}) VALUES (${vals}) ON CONFLICT ("id") DO NOTHING;\n`;
    }
    sql += '\n';
  }

  // 2. Export Roles
  const roles = await prisma.role.findMany();
  if (roles.length > 0) {
    sql += '-- Table: roles\n';
    for (const r of roles) {
      const cols = Object.keys(r).map(k => `"${k}"`).join(', ');
      const vals = Object.values(r).map(escapeValue).join(', ');
      sql += `INSERT INTO "roles" (${cols}) VALUES (${vals}) ON CONFLICT ("id") DO NOTHING;\n`;
    }
    sql += '\n';
  }

  // 3. Export Properties
  const properties = await prisma.property.findMany();
  if (properties.length > 0) {
    sql += '-- Table: properties\n';
    for (const p of properties) {
      // Exclude embedding vector from JS-based SQL export as it's complex, or format it
      const { embedding, ...rest } = p;
      const cols = Object.keys(rest).map(k => `"${k}"`).join(', ');
      const vals = Object.values(rest).map(escapeValue).join(', ');
      sql += `INSERT INTO "properties" (${cols}) VALUES (${vals}) ON CONFLICT ("id") DO NOTHING;\n`;
    }
    sql += '\n';
  }

  // 4. Export KnowledgeBase
  const knowledgeBase = await prisma.$queryRaw`SELECT id, content, embedding::text AS embedding, created_at, updated_at FROM knowledge_base`;
  if (knowledgeBase.length > 0) {
    sql += '-- Table: knowledge_base\n';
    for (const kb of knowledgeBase) {
      const valId = escapeValue(kb.id);
      const valContent = escapeValue(kb.content);
      const valCreatedAt = kb.created_at ? escapeValue(new Date(kb.created_at).toISOString()) : 'NOW()';
      const valUpdatedAt = kb.updated_at ? escapeValue(new Date(kb.updated_at).toISOString()) : 'NOW()';
      
      let valEmbedding = 'NULL';
      if (kb.embedding) {
        // kb.embedding is a string like '[0.1, 0.2, ...]'
        valEmbedding = `'${kb.embedding}'::vector`;
      }
      
      sql += `INSERT INTO "knowledge_base" ("id", "content", "embedding", "created_at", "updated_at") VALUES (${valId}, ${valContent}, ${valEmbedding}, ${valCreatedAt}::timestamp, ${valUpdatedAt}::timestamp) ON CONFLICT ("id") DO NOTHING;\n`;
    }
    sql += '\n';
  }

  fs.writeFileSync('database-backup.sql', sql, 'utf8');
  console.log('Successfully generated database-backup.sql!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
