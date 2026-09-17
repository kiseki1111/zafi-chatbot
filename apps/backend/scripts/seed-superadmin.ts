import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const superadminEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@propertiku.id';
  const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'Superadmin@123';
  const hashedPassword = await bcrypt.hash(superadminPassword, 10);

  console.log(`[Seed-Superadmin] Membuat akun: ${superadminEmail}`);

  const user = await prisma.user.upsert({
    where: { email: superadminEmail },
    update: {
      role: 'superadmin',
      name: 'Super Admin Master',
    },
    create: {
      name: 'Super Admin Master',
      email: superadminEmail,
      password: hashedPassword,
      role: 'superadmin',
    },
  });

  console.log(`[Success] Akun Superadmin siap!`);
  console.log(`- Email: ${user.email}`);
  console.log(`- Password: ${superadminPassword}`);
  console.log(`- Role: ${user.role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
