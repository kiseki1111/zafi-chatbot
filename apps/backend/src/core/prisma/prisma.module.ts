import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Menjadikan modul ini tersedia di seluruh aplikasi tanpa perlu re-import berulang kali
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Mengekspor servis agar bisa di-inject ke kelas Repositori pengguna Anda
})
export class PrismaModule {}
