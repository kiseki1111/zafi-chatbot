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
  }

  // Mengontrol pemutusan koneksi saat aplikasi ditutup (mencegah memory leak / open handles di Jest)
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
