const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const divisions = await prisma.division.findMany();
  console.log('Divisions in DB:', divisions);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
