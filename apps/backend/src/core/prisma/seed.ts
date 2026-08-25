import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed process for UMKM Assistant...');

    // Hash password default
    const defaultPassword = await bcrypt.hash('Admin@123', 12);

    // Seed Superadmin
    const superadmin = await prisma.user.upsert({
        where: { email: 'superadmin@umkm.id' },
        update: {},
        create: {
            email: 'superadmin@umkm.id',
            name: 'Super Admin',
            password: defaultPassword,
            role: 'SUPERADMIN',
        },
    });
    console.log('Superadmin user created:', superadmin.email);

    // Seed User (CS)
    const csUser = await prisma.user.upsert({
        where: { email: 'cs@umkm.id' },
        update: {},
        create: {
            email: 'cs@umkm.id',
            name: 'Customer Service',
            password: defaultPassword,
            role: 'USER',
        },
    });
    console.log('CS user created:', csUser.email);

    console.log('Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });