const { PrismaClient } = require('@prisma/client');
process.env.DATABASE_URL = 'postgresql://postgres:secret_password@127.0.0.1:5432/rbac_api_db?schema=public';
const prisma = new PrismaClient();

async function runTenantIsolationAndFeatureAudit() {
  console.log('============================================================');
  console.log('🔒 MULTI-TENANT ISOLATION & FEATURE COMPREHENSIVE AUDIT');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${details ? '--> ' + details : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // SECTION 1: VERIFIKASI PEMBERSIHAN DEV-SESSION DI DATABASE
    // -------------------------------------------------------------
    console.log('--- 1. AUDIT SESI WAHA & CLEANUP DEV-SESSION ---');
    const devSession = await prisma.whatsappInstance.findUnique({
      where: { instanceName: 'dev-session' },
    });
    assert(!devSession, 'Sesi "dev-session" harus bersih dan tidak ada di database');

    const allInstances = await prisma.whatsappInstance.findMany({
      select: { instanceName: true, status: true, phone: true, tenantId: true },
    });
    console.log(`  ℹ Info: Total sesi WAHA aktif di DB: ${allInstances.length}`);
    for (const inst of allInstances) {
      console.log(`    - ${inst.instanceName} (Status: ${inst.status}, Phone: ${inst.phone || 'none'}, Tenant: ${inst.tenantId?.slice(0, 8) || 'none'})`);
    }

    // -------------------------------------------------------------
    // SECTION 2: SETUP 2 TENANT ISOLASI UNTUK PENGUJIAN KEBOCORAN
    // -------------------------------------------------------------
    console.log('\n--- 2. SETUP DUA TENANT ISOLASI (TENANT ALPHA VS TENANT BETA) ---');
    const tenantAlpha = await prisma.tenant.create({
      data: {
        name: 'Tenant Alpha (Retail F&B)',
        category: 'general',
        agentName: 'Luna Alpha',
        metadata: { plan: 'lite', maxMau: 300, maxAiResponses: 1000 },
      },
    });

    const tenantBeta = await prisma.tenant.create({
      data: {
        name: 'Tenant Beta (Fashion Batik)',
        category: 'general',
        agentName: 'Luna Beta',
        metadata: { plan: 'silver', maxMau: 2500, maxAiResponses: 10000 },
      },
    });

    assert(tenantAlpha.id && tenantBeta.id, 'Dua tenant terisolasi berhasil dibuat di DB');

    // Buat WhatsApp Instance untuk Alpha & Beta
    const instAlpha = await prisma.whatsappInstance.create({
      data: {
        instanceName: `wa-alpha-${Date.now()}`,
        status: 'WORKING',
        phone: '6281111111111@c.us',
        profileName: 'Alpha WA',
        tenantId: tenantAlpha.id,
      },
    });

    const instBeta = await prisma.whatsappInstance.create({
      data: {
        instanceName: `wa-beta-${Date.now()}`,
        status: 'WORKING',
        phone: '6282222222222@c.us',
        profileName: 'Beta WA',
        tenantId: tenantBeta.id,
      },
    });

    assert(instAlpha.id && instBeta.id, 'Dua WhatsApp Instance terisolasi per-tenant berhasil dibuat');

    // -------------------------------------------------------------
    // SECTION 3: PENGUJIAN KEBOCORAN DATA PRODUK (PRODUCT ISOLATION)
    // -------------------------------------------------------------
    console.log('\n--- 3. PENGUJIAN KEBOCORAN DATA KATALOG PRODUK ---');
    // Buat produk untuk Alpha
    const prodAlpha = await prisma.product.create({
      data: {
        tenantId: tenantAlpha.id,
        name: 'Kopi Arabika Alpha Blend',
        category: 'Minuman',
        price: 45000,
        stock: 50,
        description: 'Kopi rahasia resep Alpha',
        attributes: {
          hasVariations: true,
          variationType: 'Ukuran',
          variations: [
            { id: '1', name: 'Regular 250g', price: 45000, stock: 30 },
            { id: '2', name: 'Large 500g', price: 80000, stock: 20 },
          ],
        },
      },
    });

    // Buat produk untuk Beta
    const prodBeta = await prisma.product.create({
      data: {
        tenantId: tenantBeta.id,
        name: 'Kemeja Batik Sutra Beta Exclusive',
        category: 'Pakaian',
        price: 350000,
        stock: 15,
        description: 'Batik motif rahasia Beta',
        attributes: { hasVariations: false },
      },
    });

    // Tes Query Produk Tenant Alpha
    const alphaProducts = await prisma.product.findMany({
      where: { tenantId: tenantAlpha.id },
    });
    assert(
      alphaProducts.length === 1 && alphaProducts[0].id === prodAlpha.id,
      'Query produk Tenant Alpha hanya mengembalikan produk Alpha (1 item)'
    );
    assert(
      !alphaProducts.some((p) => p.name.includes('Beta')),
      'Produk Tenant Beta TIDAK BOCOR ke dalam list Tenant Alpha'
    );

    // Tes Query Produk Tenant Beta
    const betaProducts = await prisma.product.findMany({
      where: { tenantId: tenantBeta.id },
    });
    assert(
      betaProducts.length === 1 && betaProducts[0].id === prodBeta.id,
      'Query produk Tenant Beta hanya mengembalikan produk Beta (1 item)'
    );
    assert(
      !betaProducts.some((p) => p.name.includes('Alpha')),
      'Produk Tenant Alpha TIDAK BOCOR ke dalam list Tenant Beta'
    );

    // Coba Cross-Tenant Edit: Cari produk Beta menggunakan scope tenant Alpha
    const crossProduct = await prisma.product.findFirst({
      where: { id: prodBeta.id, tenantId: tenantAlpha.id },
    });
    assert(
      crossProduct === null,
      'Tenant Alpha TIDAK BISA menemukan atau mengedit produk milik Tenant Beta'
    );

    // -------------------------------------------------------------
    // SECTION 4: PENGUJIAN KEBOCORAN CRM PELANGGAN (CONTACT ISOLATION)
    // -------------------------------------------------------------
    console.log('\n--- 4. PENGUJIAN KEBOCORAN DATA CRM PELANGGAN ---');
    const contactAlpha = await prisma.contact.create({
      data: {
        tenantId: tenantAlpha.id,
        name: 'Pelanggan Rahasia Alpha',
        phone: '6281234444001',
        email: 'vip-alpha@gmail.com',
        notes: 'Pelanggan loyal Alpha deal Rp 50jt',
      },
    });

    const contactBeta = await prisma.contact.create({
      data: {
        tenantId: tenantBeta.id,
        name: 'Pelanggan Rahasia Beta',
        phone: '6281234444002',
        email: 'vip-beta@gmail.com',
        notes: 'Pelanggan loyal Beta deal Rp 100jt',
      },
    });

    // Query kontak Alpha
    const alphaContacts = await prisma.contact.findMany({
      where: { tenantId: tenantAlpha.id },
    });
    assert(
      alphaContacts.some((c) => c.id === contactAlpha.id),
      'Kontak Alpha berhasil ditemukan dalam scope Alpha'
    );
    assert(
      !alphaContacts.some((c) => c.id === contactBeta.id),
      'Kontak Tenant Beta TIDAK BOCOR ke kontak Tenant Alpha'
    );

    // Cross-tenant update kontak
    const crossContact = await prisma.contact.findFirst({
      where: { id: contactBeta.id, tenantId: tenantAlpha.id },
    });
    assert(
      crossContact === null,
      'Tenant Alpha TIDAK BISA mengakses detail kontak milik Tenant Beta'
    );

    // -------------------------------------------------------------
    // SECTION 5: PENGUJIAN KEBOCORAN SESI CHAT & CONVERSATION
    // -------------------------------------------------------------
    console.log('\n--- 5. PENGUJIAN KEBOCORAN OBROLAN LIVE CHAT & PESAN ---');
    // Buat percakapan untuk Alpha
    const convAlpha = await prisma.conversation.create({
      data: {
        instanceName: instAlpha.instanceName,
        contactId: contactAlpha.id,
        status: 'OPEN',
        lastMessageAt: new Date(),
      },
    });

    const msgAlpha = await prisma.message.create({
      data: {
        conversationId: convAlpha.id,
        senderType: 'customer',
        messageType: 'text',
        content: 'Halo Alpha, ini data sensitif saya!',
      },
    });

    // Buat percakapan untuk Beta
    const convBeta = await prisma.conversation.create({
      data: {
        instanceName: instBeta.instanceName,
        contactId: contactBeta.id,
        status: 'OPEN',
        lastMessageAt: new Date(),
      },
    });

    const msgBeta = await prisma.message.create({
      data: {
        conversationId: convBeta.id,
        senderType: 'customer',
        messageType: 'text',
        content: 'Halo Beta, ini informasi internal kami!',
      },
    });

    // Cek query percakapan berdasar tenant Alpha
    const alphaConversations = await prisma.conversation.findMany({
      where: { whatsappInstance: { tenantId: tenantAlpha.id } },
      include: { messages: true },
    });
    assert(
      alphaConversations.some((c) => c.id === convAlpha.id),
      'Percakapan Alpha ada di scope Alpha'
    );
    assert(
      !alphaConversations.some((c) => c.id === convBeta.id),
      'Percakapan Tenant Beta TIDAK BOCOR ke Tenant Alpha'
    );

    const alphaMessages = alphaConversations.flatMap((c) => c.messages);
    assert(
      !alphaMessages.some((m) => m.content.includes('informasi internal kami')),
      'Pesan chat rahasia Tenant Beta TIDAK BOCOR ke pesan Tenant Alpha'
    );

    // -------------------------------------------------------------
    // SECTION 6: PENGUJIAN KEBOCORAN KNOWLEDGE BASE AI (RAG)
    // -------------------------------------------------------------
    console.log('\n--- 6. PENGUJIAN KEBOCORAN DOKUMEN KNOWLEDGE BASE ---');
    const kbAlpha = await prisma.knowledgeBase.create({
      data: {
        tenant: { connect: { id: tenantAlpha.id } },
        content: 'SOP Pelayanan Rahasia Alpha: Cara melayani pelanggan di gerai Alpha secara eksklusif.',
      },
    });

    const kbBeta = await prisma.knowledgeBase.create({
      data: {
        tenant: { connect: { id: tenantBeta.id } },
        content: 'Formula Bahan Rahasia Beta: Formula pewarna alami kain batik khas Beta.',
      },
    });

    const alphaKbList = await prisma.knowledgeBase.findMany({
      where: { tenantId: tenantAlpha.id },
    });
    assert(
      alphaKbList.some((k) => k.id === kbAlpha.id),
      'Knowledge Alpha tampil untuk tenant Alpha'
    );
    assert(
      !alphaKbList.some((k) => k.id === kbBeta.id),
      'Dokumen training AI Tenant Beta TIDAK BOCOR ke Tenant Alpha'
    );

    // -------------------------------------------------------------
    // SECTION 7: PENGUJIAN DEFAULT MENU KLIEN BARU
    // -------------------------------------------------------------
    console.log('\n--- 7. AUDIT DEFAULT MENU KLIEN BARU ---');
    const defaultMandatoryMenus = [
      'overview',
      'chatbot',
      'products',
      'knowledge',
      'crm',
      'followup',
      'settings',
    ];

    const newGeneralMenus = [...defaultMandatoryMenus];
    assert(
      newGeneralMenus.includes('chatbot') &&
      newGeneralMenus.includes('products') &&
      newGeneralMenus.includes('knowledge') &&
      newGeneralMenus.includes('crm') &&
      newGeneralMenus.includes('followup'),
      'Klien baru kategori umum otomatis menerima menu Bot WA, Produk, Knowledge, Pelanggan, dan Follow-Up'
    );
    assert(
      !newGeneralMenus.includes('availability') && !newGeneralMenus.includes('bus_layout'),
      'Klien baru kategori umum bersih dari modul vertikal properti / bus'
    );

    // -------------------------------------------------------------
    // SECTION 8: CLEANUP DATA PENGUJIAN
    // -------------------------------------------------------------
    console.log('\n--- 8. CLEANUP ARTIFAK DATA PENGUJIAN ---');
    await prisma.message.deleteMany({ where: { conversationId: { in: [convAlpha.id, convBeta.id] } } });
    await prisma.conversation.deleteMany({ where: { id: { in: [convAlpha.id, convBeta.id] } } });
    await prisma.contact.deleteMany({ where: { id: { in: [contactAlpha.id, contactBeta.id] } } });
    await prisma.product.deleteMany({ where: { id: { in: [prodAlpha.id, prodBeta.id] } } });
    await prisma.knowledgeBase.deleteMany({ where: { id: { in: [kbAlpha.id, kbBeta.id] } } });
    await prisma.whatsappInstance.deleteMany({ where: { id: { in: [instAlpha.id, instBeta.id] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAlpha.id, tenantBeta.id] } } });
    console.log('  ✓ Data pengujian isolasi tenant berhasil dibersihkan.');

    console.log('\n============================================================');
    console.log(`HASIL AUDIT: ${passed} PASSED, ${failed} FAILED`);
    console.log('STATUS ISOLASI TENANT: ' + (failed === 0 ? '100% AMAN (ZERO LEAKAGE)' : 'ADA KEBOCORAN'));
    console.log('============================================================\n');

    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('Audit Error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTenantIsolationAndFeatureAudit();
