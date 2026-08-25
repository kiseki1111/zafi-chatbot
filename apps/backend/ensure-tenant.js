const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    INSERT INTO "tenants" (id, "name", "created_at", "updated_at") 
    VALUES ('t-123', 'Dummy Tenant', NOW(), NOW()) 
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log("Tenant t-123 ensured.");
}
main().finally(() => prisma.$disconnect());
