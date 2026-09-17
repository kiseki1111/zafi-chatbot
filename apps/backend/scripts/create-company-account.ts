import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.MANAGER_EMAIL || 'manager@perusahaan.com';
  const password = process.env.MANAGER_PASSWORD || 'Manager@123';
  const tenantName = process.env.TENANT_NAME || 'PT Properti Maju Bersama';

  console.log(`[Create-Tenant] Membuat tenant: ${tenantName}`);

  let tenant = await prisma.tenant.findFirst({ where: { name: tenantName } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        phone: '628123456789',
        agentName: 'Luna',
        agentTone: 'ramah dan profesional',
      },
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Buat User Manager
  const manager = await prisma.user.upsert({
    where: { email },
    update: { role: 'manager', tenantId: tenant.id },
    create: {
      name: 'Manajer Utama',
      email,
      password: hashedPassword,
      role: 'manager',
      tenantId: tenant.id,
    },
  });

  console.log(`[Success] Akun Manager siap: ${manager.email} (Password: ${password})`);

  // Buat User Administrator (Staf CS untuk takeover)
  const adminEmail = 'admin@perusahaan.com';
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'administrator', tenantId: tenant.id },
    create: {
      name: 'Staf CS Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'administrator',
      tenantId: tenant.id,
    },
  });

  console.log(`[Success] Akun Administrator siap: ${adminUser.email} (Password: ${password})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
