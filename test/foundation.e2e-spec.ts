import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';
import helmet from 'helmet';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Skenario Fondasi Keamanan & Fungsionalitas (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUser: any;
  let rawEmail: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.use(helmet());
    app.enableCors({
      origin: ['http://localhost:3000', 'https://app.zafiproperti.com'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true,
    });
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
    
    rawEmail = `e2e-${Date.now()}@test.com`;
    const hashedPassword = await bcrypt.hash('Rahasia123!', 10);
    testUser = await prisma.user.create({
      data: {
        email: rawEmail,
        name: 'Foundation E2E User',
        password: hashedPassword,
      }
    });
  });

  afterAll(async () => {
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
    await app.close();
  });

  it('1. HTTP Headers Security (Helmet)', async () => {
    const res = await request(app.getHttpServer()).get('/not-found-route');
    expect(res.headers['x-xss-protection']).toBeDefined();
    expect(res.headers['x-content-type-options']).toEqual('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('2. Kebijakan CORS', async () => {
    const resAllowed = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'https://app.zafiproperti.com');
    expect(resAllowed.headers['access-control-allow-origin']).toEqual('https://app.zafiproperti.com');

    const resBlocked = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'https://hacker-domain.com');
    expect(resBlocked.headers['access-control-allow-origin']).toBeUndefined();
  });



  it('4. Validasi Input dan Mass Assignment', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: rawEmail,
        passwordPlain: 'Rahasia123!',
        roles: ['SUPER_ADMIN'] // Properti ilegal di luar LoginDto
      });
    expect(res.status).toEqual(400); // Harus ditolak
  });

  it('5. Format Balasan Global', async () => {
    // Tes Rute Fiktif (Exception Filter)
    const resFail = await request(app.getHttpServer()).get('/rute-fiktif-sekali');
    expect(resFail.body).toHaveProperty('statusCode');
    expect(resFail.body).toHaveProperty('error');
    expect(resFail.body).toHaveProperty('message');

    // Tes Rute Sukses (Response Interceptor)
    const resSuccess = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: rawEmail, passwordPlain: 'Rahasia123!' });
    
    // Karena dibungkus ResponseInterceptor, JSON utamanya ada 'data'
    expect(resSuccess.body).toHaveProperty('data');
    expect(resSuccess.body.data).toHaveProperty('accessToken');
  });

  it('6. Kekebalan Rute Tanpa Token', async () => {
    // Protected Route
    const resProtected = await request(app.getHttpServer()).post('/auth/logout');
    expect(resProtected.status).toEqual(401);

    // Public Route (login) dg parameter salah, kalau di intercept filter maka return statusnya 401 bukan 400
    const resPublic = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'salah@example.com', passwordPlain: 'password_salah_panjang' });
    expect(resPublic.status).toEqual(401); 
  });

  it('7. Kekuatan Hashing Kredensial', async () => {
    const dbUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(dbUser!.password).toMatch(/^\$2[aby]\$/); // Format Bcrypt Hash
    expect(dbUser!.password).not.toEqual('Rahasia123!');
  });

  it('8. Penghapusan Lunak (Soft Deletion)', async () => {
    // Karena Prisma tidak ada endpoint Delete default di Auth, kita simulasikan mekanisme aplikasi
    await prisma.user.update({
      where: { id: testUser.id },
      data: { deletedAt: new Date() }
    });
    
    const dbUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(dbUser).toBeDefined(); // Datanya masih ada di database
    expect(dbUser!.deletedAt).not.toBeNull(); // Namun stempel waktu penghapusan terisi
  });

  it('9. Pencatatan Jejak Audit', async () => {
    // Paksa auth logic mencatat FAILED
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: rawEmail, passwordPlain: 'salah_password_aja' });

    const auditLog = await prisma.auditLog.findFirst({
      where: { action: 'AUTH_LOGIN_FAILED', details: { equals: { emailAttempt: rawEmail, reason: 'Kata sandi atau email keliru' } } as any },
      orderBy: { createdAt: 'desc' }
    });
    expect(auditLog).toBeDefined();
    expect(auditLog!.status).toEqual('FAILED');
  });

  it('10. Siklus Hidup Rotasi Token', async () => {
    // Bersihkan sesi sebelumnya agar findFirst akurat
    await prisma.refreshToken.deleteMany({
      where: { userId: testUser.id }
    });

    // 1. Dapatkan Token Baru dari Login
    // Restore deletedAt biar bisa login lagi
    await prisma.user.update({
      where: { id: testUser.id },
      data: { deletedAt: null }
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: rawEmail, passwordPlain: 'Rahasia123!' });
    
    const refreshTokenLama = loginRes.body.data.refreshToken;

    // 2. Refresh Token Pertama Kali (Sukses)
    const refresh1 = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ userId: testUser.id, refreshTokenPlain: refreshTokenLama });
    
    expect(refresh1.status).toEqual(200);
    expect(refresh1.body.data.accessToken).toBeDefined();

    // 3. Refresh Token Kedua Kali dengan token yang sama (Gagal -> 401)
    const refresh2 = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ userId: testUser.id, refreshTokenPlain: refreshTokenLama });
    
    expect(refresh2.status).toEqual(401);
  });

  it('3. Rate Limiting dan Pencegahan Brute Force', async () => {
    let status = 200;
    // Loop 101 kali untuk trigger limit 100
    for (let i = 0; i <= 100; i++) {
      const res = await request(app.getHttpServer()).post('/auth/login').send({});
      status = res.status;
      if (status === 429) break;
    }
    expect(status).toEqual(429);
  }, 15000);
});
