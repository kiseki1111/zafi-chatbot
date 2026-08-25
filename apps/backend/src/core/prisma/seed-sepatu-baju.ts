import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed process for UMKM tenants...');

    const defaultPassword = await bcrypt.hash('Admin@123', 12);

    // Create Tenant: Toko Baju
    const tenantBaju = await prisma.tenant.create({
        data: {
            name: 'Zafi Fashion (Toko Baju)',
            category: 'Fashion',
            address: 'Jl. Ahmad Yani No. 10, Bandung',
            agentName: 'Zafi',
            agentTone: 'Gaul dan kekinian, panggil Sis/Bro',
            closingTime: '21:00',
            isOnboarded: true,
            products: {
                create: [
                    { name: 'Kemeja Flanel Kotak-kotak', description: 'Flanel premium', price: 150000, stock: 30, category: 'Kemeja' },
                    { name: 'Kaos Polos Oversize', description: 'Bahan cotton combed 24s', price: 75000, stock: 50, category: 'Kaos' },
                ]
            },
            knowledgeBases: {
                create: [
                    { content: 'Bisa tukar size maksimal 1 hari setelah barang sampai asalkan tag tidak dilepas.' },
                    { content: 'Pengiriman setiap jam 4 sore. Pesanan di atas jam 3 sore dikirim esok hari.' },
                ]
            }
        }
    });

    await prisma.user.create({
        data: {
            email: 'owner@tokobaju.com',
            name: 'Andi (Owner Toko Baju)',
            password: defaultPassword,
            role: 'OWNER',
            tenantId: tenantBaju.id,
        },
    });

    // Create Tenant: Toko Sepatu
    const tenantSepatu = await prisma.tenant.create({
        data: {
            name: 'Sneakers Hype (Toko Sepatu)',
            category: 'Shoes',
            address: 'Jl. Merdeka No. 99, Jakarta',
            agentName: 'Ken',
            agentTone: 'Anak senaker head, asik',
            closingTime: '22:00',
            isOnboarded: true,
            products: {
                create: [
                    { name: 'Sneakers Putih Classic', description: 'Sepatu putih cocok untuk sekolah/kuliah', price: 250000, stock: 15, category: 'Sneakers' },
                    { name: 'Running Shoes Black', description: 'Sepatu lari ringan', price: 320000, stock: 8, category: 'Olahraga' },
                ]
            },
            knowledgeBases: {
                create: [
                    { content: 'Semua sepatu dijamin original 100%. Uang kembali jika terbukti KW.' },
                    { content: 'Tersedia ukuran 39 sampai 44. Tidak menerima custom size.' },
                ]
            }
        }
    });

    await prisma.user.create({
        data: {
            email: 'owner@tokosepatu.com',
            name: 'Bima (Owner Toko Sepatu)',
            password: defaultPassword,
            role: 'OWNER',
            tenantId: tenantSepatu.id,
        },
    });

    console.log('Added Toko Baju & Toko Sepatu! Login with: owner@tokobaju.com / owner@tokosepatu.com');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
