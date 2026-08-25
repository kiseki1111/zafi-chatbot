const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateSeedJson() {
  console.log('Memulai pembaruan data seed dengan struktur JSON NoSQL...');
  const tenantId = '11111111-1111-1111-1111-111111111111';

  // 1. Update Tenant Metadata
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      metadata: {
        has_physical_store: true,
        priority_support: true,
        integrated_platforms: ['Instagram', 'Shopee', 'Tokopedia'],
        store_policy: {
          max_return_days: 7,
          accept_cod: true
        }
      }
    }
  });
  console.log('✅ Berhasil mengupdate metadata JSON pada Tenant Toko Sepatu.');

  // 2. Update Product Attributes
  const products = await prisma.product.findMany({ where: { tenantId } });
  
  for (const product of products) {
    let attributes = {};
    if (product.category === 'Sneakers') {
      attributes = { sizes: [38, 39, 40, 41, 42, 43], colors: ['Putih', 'Hitam', 'Abu-abu'], material: 'Mesh Breathable', is_unisex: true };
    } else if (product.category === 'Formal') {
      attributes = { sizes: [40, 41, 42, 43, 44], colors: ['Hitam', 'Coklat Tua'], material: 'Kulit Sapi Asli', warranty_months: 6 };
    } else if (product.category === 'Running') {
      attributes = { sizes: [39, 40, 41, 42], colors: ['Neon Kuning', 'Biru Dongker'], weight_grams: 250, drop_mm: 8 };
    } else if (product.category === 'Outdoor') {
      attributes = { sizes: [40, 41, 42, 43, 44, 45], colors: ['Coklat', 'Hijau Army'], waterproof: true, sole_type: 'Vibram' };
    } else if (product.category === 'Sandal') {
      attributes = { sizes: [38, 39, 40, 41, 42, 43], colors: ['Hitam', 'Navy', 'Olive'], material: 'EVA Rubber', washable: true };
    } else {
      attributes = { standard_item: true };
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { attributes }
    });
  }
  console.log(`✅ Berhasil mengupdate attributes JSON pada ${products.length} produk.`);

  // 3. Update KnowledgeBase Metadata
  const kbs = await prisma.knowledgeBase.findMany({ where: { tenantId } });
  let updatedKb = 0;
  for (const kb of kbs) {
    let metadata = { type: 'GENERAL' };
    
    if (kb.content.includes('Tukar Ukuran') || kb.content.includes('Retur')) {
      metadata = { type: 'FAQ', tags: ['kebijakan', 'retur'], priority: 'high', valid_until: '2026-12-31' };
    } else if (kb.content.includes('Promo') || kb.content.includes('Diskon')) {
      metadata = { type: 'PROMO', tags: ['diskon', 'marketing'], priority: 'medium', valid_until: '2026-08-17' };
    } else if (kb.content.includes('Size Chart') || kb.content.includes('Ukuran')) {
      metadata = { type: 'GUIDE', tags: ['panduan', 'ukuran'], priority: 'high' };
    }

    await prisma.knowledgeBase.update({
      where: { id: kb.id },
      data: { metadata }
    });
    updatedKb++;
  }
  console.log(`✅ Berhasil mengupdate metadata JSON pada ${updatedKb} entri Knowledge Base.`);
}

updateSeedJson()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
