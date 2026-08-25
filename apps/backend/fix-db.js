const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe('DELETE FROM sales_records WHERE tenant_id NOT IN (SELECT id FROM tenants)');
    console.log('Cleaned sales_records');
  } catch (e) {
    console.log('Error cleaning sales_records:', e.message);
  }
  
  try {
    await prisma.$executeRawUnsafe('DELETE FROM whatsapp_instances WHERE tenant_id NOT IN (SELECT id FROM tenants)');
    console.log('Cleaned whatsapp_instances');
  } catch (e) {
    console.log('Error cleaning whatsapp_instances:', e.message);
  }

  try {
    await prisma.$executeRawUnsafe('DELETE FROM products WHERE tenant_id NOT IN (SELECT id FROM tenants)');
    console.log('Cleaned products');
  } catch (e) {
    console.log('Error cleaning products:', e.message);
  }

  console.log('Done');
}

main().finally(() => prisma.$disconnect());
