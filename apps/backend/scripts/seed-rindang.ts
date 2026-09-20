import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * SEED AKUN RINDANG (rindang@gmail.com)
 * ==============================================
 * Fitur:
 *  - Idempotent: menggunakan upsert, AMAN bila jalan lebih dari 1x
 *    (tidak membuat duplicate; hanya create jika email belum ada).
 *  - Menu akun rindang: KOPI METADATA (enabledMenus) dari tenant ZAFI,
 *    agar rindang punya menu SAMA PERSIS dengan zafi.
 *  - Gating: hanya jalan jika env RINDANG_SEED=true (atau argument --force).
 *
 * Cara jalan produksi (via Komodo terminal iqbal-backend):
 *   RINDANG_SEED=true npx ts-node scripts/seed-rindang.ts
 *   (atau)
 *   npx ts-node scripts/seed-rindang.ts --force
 * ==============================================
 */

const RINDANG_EMAIL = 'rindang@gmail.com';
const RINDANG_PASSWORD = 'Rindang123!!!';
const RINDANG_NAME = 'Rindang';
const RINDANG_ROLE = 'manager';

const prisma = new PrismaClient();

async function main() {
  const isForce = process.argv.includes('--force');
  const isEnvOn = process.env.RINDANG_SEED === 'true';

  if (!isForce && !isEnvOn) {
    console.log(
      '⏭  Skrip diputar. Untuk mengaktifkan, jalan dengan:',
    );
    console.log('   RINDANG_SEED=true npx ts-node scripts/seed-rindang.ts');
    console.log('   (atau) npx ts-node scripts/seed-rindang.ts --force');
    return;
  }

  console.log('=== SEED AKUN RINDANG ===\n');

  // 1. Ambil metadata menu dari tenant ZAFI (copy sama menu zafi)
  const zafiTenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { name: { contains: 'Zafi' } },
        { name: { contains: 'zafi' } },
        { category: 'properti' },
      ],
    },
  });

  const zafiMeta = (zafiTenant?.metadata as any) || {};
  const zafiMenus = Array.isArray(zafiMeta.enabledMenus)
    ? zafiMeta.enabledMenus
    : ['overview', 'chatbot', 'crm', 'availability', 'knowledge', 'followup', 'settings'];

  console.log(`Menus yang dikopikan dari zafi (${zafiTenant?.name || 'tenant properti default'}):`);
  console.log(`  ${zafiMenus.join(', ')}\n`);

  // 2. Buat/ambil tenant Rindang dengan metadata SAMA zafi
  let rindangTenant = await prisma.tenant.findUnique({
    where: { id: 'f3b550a9-0c78-4a55-8360-e97f1d42dc9f' },
  });

  if (!rindangTenant) {
    rindangTenant = await prisma.tenant.create({
      data: {
        id: 'f3b550a9-0c78-4a55-8360-e97f1d42dc9f',
        name: 'Rindang Project',
        category: 'properti',
        agentName: 'Rindang AI',
        metadata: {
          ...zafiMeta,
          enabledMenus: zafiMenus,
        },
      },
    });
    console.log(`✓ Tenant Rindang dibuat: ${rindangTenant.name}\n`);
  } else {
    console.log(`ℹ Tenant Rindang sudah ada: ${rindangTenant.name}\n`);
  }

  // 3. Hash password
  const hashedPassword = await bcrypt.hash(RINDANG_PASSWORD, 10);

  // 4. Buat/ambil user rindang (idempotent)
  const existingUser = await prisma.user.findUnique({
    where: { email: RINDANG_EMAIL },
  });

  const rindangUser = await prisma.user.upsert({
    where: { email: RINDANG_EMAIL },
    update: {
      name: RINDANG_NAME,
      role: RINDANG_ROLE,
      tenantId: rindangTenant.id,
      isActive: true,
    },
    create: {
      name: RINDANG_NAME,
      email: RINDANG_EMAIL,
      password: hashedPassword,
      role: RINDANG_ROLE,
      tenantId: rindangTenant.id,
      isActive: true,
    },
  });

  if (existingUser) {
    console.log('ℹ Akun rindang sudah ada sebelum skrip. Tidak duplicate — hanya update role/tenant.');
  } else {
    console.log('✓ Akun rindang berhasil BUAT (pertama kali).');
  }
  console.log(`   Email   : ${rindangUser.email}`);
  console.log(`   Password: ${RINDANG_PASSWORD}`);
  console.log(`   Role    : ${rindangUser.role}`);
  console.log(`   Tenant  : ${rindangTenant.name} (${rindangTenant.id})`);
  console.log(`   Menu    : ${zafiMenus.join(', ')}`);

  console.log('\n=== SEED SELESAI ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });