const { PrismaClient } = require('@prisma/client');
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

  const convIds = [
    'c5e4a30c-ad65-45b5-bd34-3795c4a0ac8e',
    'ac1a496c-e257-4218-92bd-5a73b63d02db',
    'df09e580-a9a2-47d5-930c-99548de5dd64',
    '6c4223e1-c5f0-43f9-9c71-f57be5bfe8f7',
    '8de23fe3-3544-4047-aae5-2cc994053f7a'
  ];
  for (const id of convIds) {
    const q = "INSERT INTO conversations (id, contact_id, instance_name, status) VALUES ('" + id + "', '" + contact.id + "', '" + instance.instanceName + "', 'OPEN') ON CONFLICT DO NOTHING";
    await prisma.$executeRawUnsafe(q);
  }
  console.log('Inserted conversations');
}
main().finally(() => prisma.$disconnect());
