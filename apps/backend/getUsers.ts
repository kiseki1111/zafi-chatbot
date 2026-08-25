const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            tenant: { select: { name: true } }
        }
    });
    console.table(users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        tenant: u.tenant ? u.tenant.name : 'N/A'
    })));
}
main().finally(() => prisma.$disconnect());
