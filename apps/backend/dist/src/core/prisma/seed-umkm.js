"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Starting seed process for UMKM tenants...');
    const defaultPassword = await bcrypt.hash('Admin@123', 12);
    await prisma.knowledgeBase.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany({ where: { role: 'OWNER' } });
    await prisma.tenant.deleteMany();
    const tenantKopi = await prisma.tenant.create({
        data: {
            name: 'Kopi Senja',
            category: 'F&B',
            address: 'Jl. Sudirman No. 123, Jakarta',
            agentName: 'Aria',
            agentTone: 'Ramah dan santai',
            closingTime: '22:00',
            isOnboarded: true,
            products: {
                create: [
                    { name: 'Es Kopi Susu Gula Aren', description: 'Kopi susu legit menggunakan gula aren asli', price: 25000, stock: 50, category: 'Minuman Dingin' },
                    { name: 'Kopi Hitam V60', description: 'Manual brew dari biji kopi Ethiopia', price: 30000, stock: 20, category: 'Minuman Panas' },
                    { name: 'Croissant Butter', description: 'Roti croissant renyah', price: 20000, stock: 15, category: 'Makanan' },
                ]
            },
            knowledgeBases: {
                create: [
                    { content: 'Kopi Senja buka setiap hari dari jam 08:00 sampai 22:00.' },
                    { content: 'Promo beli 2 gratis 1 untuk Es Kopi Susu setiap hari Jumat. Harus datang ke toko (dine-in/takeaway).' },
                    { content: 'Untuk pemesanan dalam jumlah besar (lebih dari 20 cup), wajib order H-1.' },
                ]
            }
        }
    });
    await prisma.user.create({
        data: {
            email: 'owner@kopisenja.com',
            name: 'Budi (Owner Kopi Senja)',
            password: defaultPassword,
            role: 'OWNER',
            tenantId: tenantKopi.id,
        },
    });
    const tenantHijab = await prisma.tenant.create({
        data: {
            name: 'Hijab Modern',
            category: 'Fashion',
            address: 'Jl. Malioboro No. 45, Yogyakarta',
            agentName: 'Siti',
            agentTone: 'Sopan dan Islami, selalu sapa dengan Kak',
            closingTime: '20:00',
            isOnboarded: true,
            products: {
                create: [
                    { name: 'Pashmina Plisket', description: 'Bahan ceruty babydoll jatuh dan tidak mudah kusut', price: 45000, stock: 100, category: 'Pashmina' },
                    { name: 'Bergo Maryam', description: 'Hijab instan bahan diamond, nyaman untuk harian', price: 35000, stock: 80, category: 'Hijab Instan' },
                ]
            },
            knowledgeBases: {
                create: [
                    { content: 'Toko online Hijab Modern buka setiap hari, tapi pengiriman hari Minggu libur.' },
                    { content: 'Pengiriman dilakukan setiap jam 3 sore via JNE atau J&T. Pesanan di atas jam 3 sore dikirim besoknya.' },
                    { content: 'Retur barang rusak diterima maksimal 2x24 jam dengan menyertakan video unboxing.' },
                ]
            }
        }
    });
    await prisma.user.create({
        data: {
            email: 'owner@hijabmodern.com',
            name: 'Aisyah (Owner Hijab Modern)',
            password: defaultPassword,
            role: 'OWNER',
            tenantId: tenantHijab.id,
        },
    });
    console.log('Seed UMKM completed successfully! Login with: owner@kopisenja.com or owner@hijabmodern.com | Pass: Admin@123');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-umkm.js.map