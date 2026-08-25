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
//# sourceMappingURL=seed-sepatu-baju.js.map