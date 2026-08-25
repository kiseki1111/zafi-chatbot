const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contacts = await prisma.contact.findMany();
  let updatedCount = 0;

  for (const contact of contacts) {
    if (contact.phone.includes('@lid') || contact.name.includes('@lid')) {
      console.log(`Checking contact: ${contact.phone}`);
      
      // Get conversations for this contact
      const conversations = await prisma.conversation.findMany({
        where: { contactId: contact.id }
      });

      let foundRealPhone = null;

      for (const conv of conversations) {
        // Get messages for this conversation
        const messages = await prisma.message.findMany({
          where: { conversationId: conv.id },
          select: { raw: true }
        });

        for (const msg of messages) {
          if (msg.raw) {
            let rawData;
            try {
              rawData = typeof msg.raw === 'string' ? JSON.parse(msg.raw) : msg.raw;
            } catch (e) {
              continue; // Skip if invalid JSON
            }
            
            // remoteJidAlt is usually under key.remoteJidAlt or _data.key.remoteJidAlt
            // Let's stringify and search to be safe, or just check known paths
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
        console.log(`=> No real phone number found in raw messages for contact ${contact.phone}`);
      }
    }
  }

  console.log(`Finished updating ${updatedCount} contacts.`);
}

main().finally(() => prisma.$disconnect());
