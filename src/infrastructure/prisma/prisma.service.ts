import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

// Memuat variabel lingkungan secara terisolasi
dotenv.config();

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        // Membangun kolam koneksi native ke PostgreSQL menggunakan Driver Adapter untuk Prisma 7.8
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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