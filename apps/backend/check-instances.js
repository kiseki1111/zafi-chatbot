const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const instances = await prisma.whatsappInstance.findMany();
  console.log(instances.map(i => i.instanceName));
}
main().finally(() => prisma.$disconnect());
