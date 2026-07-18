"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const r1 = await prisma.message.deleteMany({
        where: { content: { contains: 'example.com' } }
    });
    const r2 = await prisma.message.deleteMany({
        where: { content: { contains: 'Link Gambar' } }
    });
    console.log(`Deleted ${r1.count + r2.count} poisoned messages`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=clean-history.js.map