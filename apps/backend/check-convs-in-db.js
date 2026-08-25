const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();
async function main() {
  const arr = JSON.parse(fs.readFileSync('conv_ids.json', 'utf8'));
  for (const id of arr) {
    const res = await prisma.$queryRawUnsafe("SELECT id FROM conversations WHERE id = '" + id + "'");
    console.log(id, 'exists:', res.length > 0);
  }
}
main().finally(() => prisma.$disconnect());
