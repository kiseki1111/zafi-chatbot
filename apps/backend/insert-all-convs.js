const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();
async function main() {
  const contact = await prisma.contact.findFirst();
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

  const allUuids = JSON.parse(fs.readFileSync('all_uuids.json', 'utf8'));
  let inserted = 0;
  for (const id of allUuids) {
    try {
      const q = "INSERT INTO conversations (id, contact_id, instance_name, status) VALUES ('" + id + "', '" + contact.id + "', '" + instance.instanceName + "', 'OPEN') ON CONFLICT DO NOTHING";
      await prisma.$executeRawUnsafe(q);
      inserted++;
    } catch (e) {
      console.log('Error inserting UUID', id, e.message);
    }
  }
  console.log('Inserted conversations:', inserted);
}
main().finally(() => prisma.$disconnect());
