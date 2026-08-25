const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contacts = await prisma.contact.findMany();
  let updatedCount = 0;

  for (const contact of contacts) {
    if (contact.phone.includes('@lid') || contact.name.includes('@lid')) {
      console.log(`Checking contact: ${contact.phone}`);
      
      const conversations = await prisma.conversation.findMany({
        where: { contactId: contact.id }
      });

      let foundRealPhone = null;

      for (const conv of conversations) {
        const messages = await prisma.message.findMany({
          where: { conversationId: conv.id },
          select: { metadata: true }
        });

        for (const msg of messages) {
          if (msg.metadata) {
            let rawData;
            try {
              rawData = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
            } catch (e) {
              continue;
            }
            
            const jsonString = JSON.stringify(rawData);
            const match = jsonString.match(/"remoteJidAlt":"([^"]+@s\.whatsapp\.net)"/);
            if (match && match[1]) {
              foundRealPhone = match[1].replace('@s.whatsapp.net', '');
              break;
            }
          }
        }
        if (foundRealPhone) break;
      }

      if (foundRealPhone) {
        console.log(`=> Found real phone number: ${foundRealPhone} for contact ${contact.phone}`);
        try {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { 
              name: foundRealPhone,
              phone: foundRealPhone
            }
          });
          updatedCount++;
        } catch (e) {
          console.error(`=> Failed to update contact ${contact.id}: ${e.message}`);
        }
      } else {
        console.log(`=> No real phone number found in metadata for contact ${contact.phone}`);
      }
    }
  }

  console.log(`Finished updating ${updatedCount} contacts.`);
}

main().finally(() => prisma.$disconnect());
