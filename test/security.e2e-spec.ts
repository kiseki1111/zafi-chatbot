import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';

describe('Security & Global Validations (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Konfigurasi ValidationPipe sama persis seperti di main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Validasi Mass Assignment (Validation Pipe)', () => {
    it('/auth/login (POST) - Harus me-reject request dengan properti ekstra ilegal', async () => {
      console.log('--- Menjalankan E2E Test: Validasi Mass Assignment ---');
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          passwordPlain: 'password123',
          roles: ['SUPER_ADMIN'], // Properti ekstra yang tidak ada di DTO
        });

      console.log(`Response Status: ${response.status}`);
      console.log(`Response Body: ${JSON.stringify(response.body)}`);

      expect(response.status).toBe(400); // Bad Request
      expect(response.body.message).toEqual(
        expect.arrayContaining(['property roles should not exist']),
      );
      console.log('✅ Berhasil: Sistem memblokir Injeksi Mass Assignment dengan status 400.');
    });
  });

  describe('Validasi Header JWT Kosong', () => {
    it('/auth/logout (POST) - Harus membalas 401 Unauthorized tanpa header Bearer', async () => {
      console.log('--- Menjalankan E2E Test: Validasi Header JWT Kosong ---');
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .send();

      console.log(`Response Status: ${response.status}`);

      expect(response.status).toBe(401);
      console.log('✅ Berhasil: Rute terlindungi menolak akses tanpa Bearer Token (Status 401).');
    });
  });

  describe('Pengujian Rate Limiter (Throttler)', () => {
    it('Harus memblokir request setelah melewati batas wajar (100 request)', async () => {
      console.log('--- Menjalankan E2E Test: Pengujian Rate Limiter (Brute Force) ---');
      
      const MAX_REQUESTS = 100;
      let lastResponseStatus = 200;

      // Menembak secara berurutan
      for (let i = 0; i <= MAX_REQUESTS; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/login') // Endpoint yang bisa diakses secara publik
          .send({
            email: 'test@example.com',
            passwordPlain: 'password123',
          });
        
        lastResponseStatus = response.status;
        
        // Error biasanya di handle sebelum logika login jika rate limit tercapai
        if (response.status === 429) {
            console.log(`Mencapai Rate Limit pada request ke-${i + 1}`);
            break;
        }
      }

      console.log(`Status HTTP Terakhir: ${lastResponseStatus}`);
      expect(lastResponseStatus).toBe(429); // 429 Too Many Requests
      console.log('✅ Berhasil: Server memproteksi API dari Brute Force dengan status 429.');
    }, 15000); // Set timeout ke 15 detik karena perulangan mungkin butuh waktu
  });
});
