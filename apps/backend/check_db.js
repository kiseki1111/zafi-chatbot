const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
  console.log(res.map(r => r.table_name));
  
  // also drop daily_sales if it exists
  try {
    await prisma.$queryRaw`DROP TABLE "daily_sales" CASCADE`;
    console.log("Successfully dropped daily_sales");
  } catch(e) {
    console.log("daily_sales not dropped:", e.message);
  }
}

main().finally(() => prisma.$disconnect());
