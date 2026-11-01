import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'DATABASE_URL environment variable is required in production.',
      );
    }
    process.env.DATABASE_URL =
      'postgresql://postgres:secret_password@127.0.0.1:5432/rbac_api_db?schema=public';
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['log', 'warn', 'error']
        : ['log', 'warn', 'error', 'debug'],
  });

  // Normalisasi url webhook WAHA yang berulang atau memiliki prefix ganda
  app.use((req: any, res: any, next: any) => {
    // ponytail: pasang correlation ID (x-request-id) untuk pelacakan log & debugging
    const reqId =
      req.headers['x-request-id'] ||
      `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    req.id = reqId;
    res.setHeader('X-Request-Id', reqId);

    if (req.url && req.url.startsWith('/api/waha/webhook')) {
      const queryIdx = req.url.indexOf('?');
      const query = queryIdx !== -1 ? req.url.substring(queryIdx) : '';
      req.url = '/api/v1/waha/webhook' + query;
    }
    next();
  });

  // Serve static assets from 'public' folder
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Serve static uploads (tersimpan di VPS disk)
  const uploadsPath = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
    setHeaders: (res, path) => {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Disposition', 'inline');
      if (path && path.toLowerCase().endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
      } else if (path && /\.(ogg|oga|opus)$/i.test(path)) {
        res.setHeader('Content-Type', 'audio/ogg');
      } else if (path && /\.mp3$/i.test(path)) {
        res.setHeader('Content-Type', 'audio/mpeg');
      } else if (path && /\.wav$/i.test(path)) {
        res.setHeader('Content-Type', 'audio/wav');
      } else if (path && /\.m4a$/i.test(path)) {
        res.setHeader('Content-Type', 'audio/mp4');
      }
    },
  });
  const configService = app.get(ConfigService);

  // 1. Mengaktifkan HTTP Security Headers sesuai panduan halaman 38
  // SECURITY: bypass mode hanya boleh aktif di non-production
  const isSecurityBypass =
    process.env.SECURITY_BYPASS_MODE === 'true' &&
    process.env.NODE_ENV !== 'production';

  if (isSecurityBypass) {
    console.warn(
      '⚠️  SECURITY BYPASS MODE IS ACTIVE: Helmet strict mode disabled',
    );
    app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
      }),
    );
  } else {
    app.use(helmet());
  }
  // 2. Mengaktifkan CORS aman: hanya izinkan origin resmi dan localhost dev
  const allowedOrigins = (
    process.env.CORS_ORIGIN ||
    process.env.FRONTEND_URL ||
    'http://localhost:3000,http://localhost:3001,https://app.zafii.tech,https://zafii.tech'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (seperti mobile apps, curl, server-to-server webhook)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      // Di mode dev, izinkan semua origin localhost
      if (
        process.env.NODE_ENV !== 'production' &&
        /^https?:\/\/localhost(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(
        new ForbiddenException(`CORS origin not allowed: ${origin}`),
      );
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // 3. Baris Kompleks: Mengunci pertahanan ValidationPipe global dari celah Mass Assignment Injection
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Otomatis membuang properti tambahan yang tidak terdaftar di DTO
      forbidNonWhitelisted: true, // Melempar error HTTP 400 jika klien nekat mengirimkan kolom luar
      transform: true, // Mengonversi tipe data input secara otomatis sesuai dekorator properti DTO
    }),
  );

  // 4. Mendaftarkan Global Interceptor dan Exception Filter
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // ponytail: enable shutdown hooks so SIGTERM/SIGINT lets in-flight AI and queue tasks drain gracefully
  app.enableShutdownHooks();

  const port = process.env.PORT || 3030;
  const server = await app.listen(port, '0.0.0.0');
  if (server) {
    // Mencegah socket hang up (ECONNRESET) saat AI Vision atau upload file besar berjalan lama
    server.keepAliveTimeout = 120000;
    server.headersTimeout = 125000;
    server.timeout = 300000;
  }
}
bootstrap();
