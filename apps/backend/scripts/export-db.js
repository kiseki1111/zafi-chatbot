const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  console.log('Exporting database...');
  const data = {
    users: await prisma.user.findMany(),
    properties: await prisma.property.findMany(),
    knowledgeBase: await prisma.knowledgeBase.findMany(),
    roles: await prisma.role.findMany(),
    // Add other tables if needed
  };

  fs.writeFileSync('database-backup.json', JSON.stringify(data, null, 2));
  console.log('Database exported successfully to database-backup.json!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
