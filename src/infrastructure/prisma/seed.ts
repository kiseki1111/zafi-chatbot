import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt'; // Baris Kritis: Mengimpor modul enkripsi untuk mengamankan data rahasia

dotenv.config();
console.log("DEBUG DATABASE_URL:", process.env.DATABASE_URL);

// Membuat kolam koneksi (pool) native ke PostgreSQL menggunakan URL dari .env
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Membungkus koneksi native tersebut dengan adapter resmi khusus Prisma
const adapter = new PrismaPg(pool);

// Menghidupkan mesin utama Prisma Client dengan menyuntikkan adapter tadi
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Memulai proses seeding data master...");

    // Penyesuaian nama permission sesuai format standar blueprint TDD (resource:action)
    const permissionData = [
        // User
        { name: 'user:create', resource: 'user', action: 'create', description: 'Hak untuk membuat pengguna baru' },
        { name: 'user:read', resource: 'user', action: 'read', description: 'Hak untuk melihat data pengguna' },
        { name: 'user:update', resource: 'user', action: 'update', description: 'Hak untuk mengubah data pengguna' },
        { name: 'user:delete', resource: 'user', action: 'delete', description: 'Hak untuk menghapus pengguna' },
        // Role
        { name: 'role:create', resource: 'role', action: 'create', description: 'Hak untuk membuat peran baru' },
        { name: 'role:read', resource: 'role', action: 'read', description: 'Hak untuk melihat peran' },
        { name: 'role:update', resource: 'role', action: 'update', description: 'Hak untuk mengubah peran' },
        { name: 'role:delete', resource: 'role', action: 'delete', description: 'Hak untuk menghapus peran' },
        // Permission
        { name: 'permission:create', resource: 'permission', action: 'create', description: 'Hak untuk membuat izin baru' },
        { name: 'permission:read', resource: 'permission', action: 'read', description: 'Hak untuk melihat izin' },
        { name: 'permission:update', resource: 'permission', action: 'update', description: 'Hak untuk mengubah izin' },
        { name: 'permission:delete', resource: 'permission', action: 'delete', description: 'Hak untuk menghapus izin' },
        // Assignment
        { name: 'assignment:create', resource: 'assignment', action: 'create', description: 'Hak untuk menugaskan peran atau izin' },
    ];

    for (const perm of permissionData) { // melakukan iterasi untuk menyuntikkan data hak akses satu per satu
        await prisma.permission.upsert({
            where: {
                resource_action: {
                    resource: perm.resource,
                    action: perm.action
                }
            },
            update: { name: perm.name, description: perm.description },
            create: perm,
        });
    }
    console.log('Permission berhasil dibuat');

    const allPermissions = await prisma.permission.findMany(); // mengambil seluruh records permission dari database untuk pemetaan relasi

    const superAdminRole = await prisma.role.upsert({ // membuat role super admin
        where: { name: 'SUPER_ADMIN' },
        update: {},
        create: {
            name: 'SUPER_ADMIN',
            description: 'Administrator dengan akses penuh ke seluruh sistem',
        },
    });

    // Pastikan SUPER_ADMIN memiliki semua permission yang ada, meskipun rolenya sudah dibuat sebelumnya
    for (const p of allPermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: superAdminRole.id,
                    permissionId: p.id,
                }
            },
            update: {},
            create: {
                roleId: superAdminRole.id,
                permissionId: p.id,
            }
        });
    }

    await prisma.role.upsert({ // membuat role admin
        where: { name: 'ADMIN' },
        update: {},
        create: { name: 'ADMIN', description: 'Administrator dengan akses terbatas' },
    });

    //meng-hash password menggunakan bcrypt dengan 12 rounds sesuai modul
    const hashedPassword = await bcrypt.hash('rahasia123', 12);

    await prisma.user.upsert({ // membuat akun super admin
        where: { email: 'superadmin@gmail.com' },
        update: { password: hashedPassword },
        create: {
            email: 'superadmin@gmail.com',
            name: 'Super Admin',
            password: hashedPassword,
            userRoles: {
                create: { roleId: superAdminRole.id },
            },
        },
    });

    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (adminRole) {
        await prisma.user.upsert({ // membuat akun admin
            where: { email: 'admin@gmail.com' },
            update: { password: hashedPassword },
            create: {
                email: 'admin@gmail.com',
                name: 'Admin User',
                password: hashedPassword,
                userRoles: {
                    create: { roleId: adminRole.id },
                },
            },
        });
    }

    await prisma.user.upsert({ // membuat akun biasa
        where: { email: 'user@gmail.com' },
        update: { password: hashedPassword },
        create: {
            email: 'user@gmail.com',
            name: 'Regular User',
            password: hashedPassword,
        },
    });
    console.log('Akun super admin, admin, dan user berhasil dibuat');
}

main()
    .then(async () => {
        await prisma.$disconnect();
        console.log('Seeding selesai');
    })
    .catch(async (e) => {
        console.error('Terjadi kesalahan saat seeding:', e);
        await prisma.$disconnect();
        process.exit(1);
    });