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
    const tenants = await prisma.tenant.findMany();
    console.log('List of all tenants:');
    tenants.forEach(t => console.log(`- [${t.id}] ${t.name}`));
    const bajuTenant = tenants.find(t => t.name.toLowerCase().includes('baju'));
    const sepatuTenant = tenants.find(t => t.name.toLowerCase().includes('sepatu'));
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
            }
        });
        console.log(`Created/Updated account for ${bajuTenant.name}: owner@tokobaju.com`);
    }
    else {
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
            }
        });
        console.log(`Created/Updated account for ${sepatuTenant.name}: owner@tokosepatu.com`);
    }
    else {
        console.log('Toko Sepatu not found in DB!');
    }
}
main().finally(() => prisma.$disconnect());
//# sourceMappingURL=link-accounts.js.map