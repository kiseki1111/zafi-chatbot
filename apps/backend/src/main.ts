import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      'postgresql://postgres:secret_password@127.0.0.1:5432/rbac_api_db?schema=public';
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['log', 'warn', 'error']
        : ['log', 'warn', 'error', 'debug'],
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
    setHeaders: (res) => {
      res.setHeader('Accept-Ranges', 'bytes');
    },
  });
  const configService = app.get(ConfigService);

  // 1. Mengaktifkan HTTP Security Headers sesuai panduan halaman 38
  const isSecurityBypass = process.env.SECURITY_BYPASS_MODE === 'true';

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
  // 2. Mengaktifkan CORS Whitelist fleksibel untuk lokal & domain resmi
  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('192.168.') ||
        origin.includes('zafiproperti.com') ||
        origin.includes('zafii.tech')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
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

  const port = process.env.PORT || 3030;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
