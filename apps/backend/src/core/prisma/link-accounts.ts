import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();

  console.log('List of all tenants:');
  tenants.forEach((t) => console.log(`- [${t.id}] ${t.name}`));

  const bajuTenant = tenants.find((t) => t.name.toLowerCase().includes('baju'));
  const sepatuTenant = tenants.find((t) =>
    t.name.toLowerCase().includes('sepatu'),
  );

  const defaultPassword = await bcrypt.hash('Admin@123', 12);

  if (bajuTenant) {
    const user = await prisma.user.upsert({
      where: { email: 'owner@tokobaju.com' },
      update: { tenantId: bajuTenant.id },
      create: {
        email: 'owner@tokobaju.com',
        name: 'Owner ' + bajuTenant.name,
        password: defaultPassword,
        role: 'OWNER',
        tenantId: bajuTenant.id,
      },
    });
    console.log(
      `Created/Updated account for ${bajuTenant.name}: owner@tokobaju.com`,
    );
  } else {
    console.log('Toko Baju not found in DB!');
  }

  if (sepatuTenant) {
    const user = await prisma.user.upsert({
      where: { email: 'owner@tokosepatu.com' },
      update: { tenantId: sepatuTenant.id },
      create: {
        email: 'owner@tokosepatu.com',
        name: 'Owner ' + sepatuTenant.name,
        password: defaultPassword,
        role: 'OWNER',
        tenantId: sepatuTenant.id,
      },
    });
    console.log(
      `Created/Updated account for ${sepatuTenant.name}: owner@tokosepatu.com`,
    );
  } else {
    console.log('Toko Sepatu not found in DB!');
  }
}

main().finally(() => prisma.$disconnect());
