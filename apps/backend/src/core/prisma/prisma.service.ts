import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    let dbUrl =
      process.env.DATABASE_URL ||
      'postgresql://postgres:secret_password@127.0.0.1:5432/rbac_api_db?schema=public';
    if (dbUrl.includes('@postgres:5432') && process.platform === 'win32') {
      dbUrl = dbUrl.replace('@postgres:5432', '@127.0.0.1:5432');
    }
    process.env.DATABASE_URL = dbUrl;

    // Membangun kolam koneksi native ke PostgreSQL menggunakan Driver Adapter untuk Prisma 7.8
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);

    // Menyuntikkan adapter ke dalam konfigurasi dasar PrismaClient
    super({ adapter });
  }

  // Mengontrol pemutusan koneksi otomatis saat modul NestJS diinisialisasi
  async onModuleInit() {
    await this.$connect();
    await this.ensureSchemaCompatibility();
  }

  /**
   * Safety net: Memastikan kolom-kolom baru krusial telah dibuat di PostgreSQL
   * jika proses db push mengalami jeda atau bypass di lingkungan runtime.
   */
  private async ensureSchemaCompatibility() {
    try {
      await this.$executeRawUnsafe(`
        DO $$
        BEGIN
          -- 1. Kolom property_type pada resource_items
          IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'resource_items'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'resource_items' AND column_name = 'property_type'
          ) THEN
            ALTER TABLE "resource_items" ADD COLUMN "property_type" VARCHAR(50) DEFAULT 'BANGUNAN';
          END IF;

          -- 2. Kolom pricing_templates pada resource_groups
          IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'resource_groups'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'resource_groups' AND column_name = 'pricing_templates'
          ) THEN
            ALTER TABLE "resource_groups" ADD COLUMN "pricing_templates" JSONB DEFAULT '[]'::jsonb;
          END IF;
        END $$;
      `);
    } catch (e: any) {
      // Tidak blocking agar aplikasi tetap berjalan meski database berbeda dialect/mock
    }
  }

  // Mengontrol pemutusan koneksi saat aplikasi ditutup (mencegah memory leak / open handles di Jest)
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
