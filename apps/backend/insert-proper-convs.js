const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();
async function main() {
  const contacts = await prisma.contact.findMany();
  let instance = await prisma.whatsappInstance.findFirst();
  if (!instance) {
     const tenant = await prisma.tenant.findFirst();
     instance = await prisma.whatsappInstance.create({
       data: {
         instanceName: 'telegram-dev-bot',
         tenantId: tenant.id
       }
     });
  }

  const arr = JSON.parse(fs.readFileSync('conv_ids.json', 'utf8'));
  for (let i = 0; i < arr.length; i++) {
    const id = arr[i];
    const contact = contacts[i % contacts.length];
    const q = "INSERT INTO conversations (id, contact_id, instance_name, status) VALUES ('" + id + "', '" + contact.id + "', '" + instance.instanceName + "', 'OPEN') ON CONFLICT DO NOTHING";
    await prisma.$executeRawUnsafe(q);
  }
  console.log('Inserted conversations properly');
}
main().finally(() => prisma.$disconnect());
