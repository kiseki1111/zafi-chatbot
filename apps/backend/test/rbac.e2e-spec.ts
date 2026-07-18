import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('RBAC Penetration Test (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let nonAdminToken: string;
  let nonAdminId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Konfigurasi persis seperti di main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    
    await app.init();
    prisma = app.get(PrismaService);

    // 1. Persiapan data: Buat user non-admin langsung di database
    // Hapus jika sudah ada dari tes sebelumnya
    await prisma.user.deleteMany({ where: { email: 'hacker@example.com' } });
    
    const passwordHash = await bcrypt.hash('rahasiaHacker123', 12);
    const nonAdminUser = await prisma.user.create({
      data: {
        email: 'hacker@example.com',
        name: 'Hacker Penyusup',
        password: passwordHash,
      }
    });
    nonAdminId = nonAdminUser.id;
  });

  afterAll(async () => {
    // Pembersihan data setelah tes selesai
    if (prisma) {
      await prisma.user.deleteMany({ where: { email: 'hacker@example.com' } });
    }
    await app.close();
  });

  it('1 & 2. POST /api/v1/auth/login - Mendapatkan Access Token non-admin', async () => {
    console.log('--- Menjalankan RBAC Test: Login Non-Admin ---');
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'hacker@example.com',
        passwordPlain: 'rahasiaHacker123',
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('accessToken');
    
    nonAdminToken = response.body.data.accessToken;
    console.log('✅ Berhasil: Access Token didapatkan.');
  });

  it('3. GET /api/v1/users - Eksekusi dengan token non-admin (Harus 403 Forbidden)', async () => {
    console.log('--- Menjalankan RBAC Test: Uji Coba Penetrasi Endpoint Users ---');
    const response = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${nonAdminToken}`);

    console.log(`Response Status: ${response.status}`);
    console.log(`Response Body: ${JSON.stringify(response.body)}`);

    // Memastikan server menolak akses dengan kode 403
    expect(response.status).toBe(403);
    
    // Memastikan pesan error sesuai dengan yang ada di dokumentasi README.md
    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 403,
        message: ['Anda tidak memiliki hak akses yang cukup untuk mengeksekusi aksi ini.']
      })
    );
    console.log('✅ Berhasil: Sistem RBAC terbukti memblokir pengguna tak berizin!');
  });
});
