const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.whatsappInstance.upsert({
    where: { instanceName: 'CLI_TEST_SESSION' },
    update: {},
    create: { instanceName: 'CLI_TEST_SESSION', status: 'ONLINE', phone: '0000', profileName: 'CLI_TEST' }
  });
  console.log('CLI Session injected');
}

main().finally(() => prisma.$disconnect());
