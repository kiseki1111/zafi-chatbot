const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const contacts = await prisma.contact.findMany();
  console.log(contacts.map(c => ({id: c.id, name: c.name, phone: c.phone})));
}
main().finally(() => prisma.$disconnect());
