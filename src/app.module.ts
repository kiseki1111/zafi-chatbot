import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import jwtConfig from './config/jwt.config'; // Pastikan file konfigurasi JWT terdaftar

@Module({
  imports: [
    // Mendaftarkan konfigurasi terpusat secara global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig],
    }),
    ThrottlerModule.forRoot([{
      ttl: 900000, // 15 menit dalam satuan milidetik (15 * 60 * 1000)
      limit: 100,  // maksimal 100 request
    }]),
    PrismaModule,
    UsersModule,
    RolesModule,
    AuthModule,
    PermissionsModule,
    AssignmentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }