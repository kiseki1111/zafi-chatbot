const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contacts = await prisma.contact.findMany();
  let updatedCount = 0;

  for (const contact of contacts) {
    if (contact.phone.includes('@s.whatsapp.net') || contact.name.includes('@s.whatsapp.net')) {
      const cleanPhone = contact.phone.replace('@s.whatsapp.net', '');
      try {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { 
            name: cleanPhone,
            phone: cleanPhone
          }
        });
        updatedCount++;
      } catch (e) {
        console.error(`=> Failed to update contact ${contact.id}: ${e.message}`);
      }
    }
  }

  console.log(`Finished updating ${updatedCount} @s.whatsapp.net contacts.`);
}

main().finally(() => prisma.$disconnect());
