import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Serve static assets from 'public' folder
  app.useStaticAssets(join(__dirname, '..', 'public'));
  const configService = app.get(ConfigService);

  // 1. Mengaktifkan HTTP Security Headers sesuai panduan halaman 38
  const isSecurityBypass = process.env.SECURITY_BYPASS_MODE === 'true';
  
  if (isSecurityBypass) {
    console.warn('⚠️  SECURITY BYPASS MODE IS ACTIVE: Helmet strict mode disabled');
    app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }));
  } else {
    app.use(helmet());
  }
  // 2. Mengaktifkan CORS Whitelist ketat sesuai Security Checklist
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://app.zafiproperti.com'], // Sesuaikan dengan domain frontend resmi
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

  const port = process.env.PORT || configService.get<number>('app.port') || 3000;
  await app.listen(port);
}
bootstrap();