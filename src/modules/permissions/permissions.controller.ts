import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard) // DIMATIKAN SEMENTARA
@UseGuards(PermissionsGuard) // Hanya menggunakan PermissionsGuard untuk saat ini
export class PermissionsController {

  @Get()
  @Permissions('permission:read')
  findAll() {
    return { message: 'Menampilkan semua data permission' };
  }

  @Post()
  @Permissions('permission:create')
  // DISESUAIKAN: Payload body sekarang mengikuti kolom di schema.prisma Anda (action dan description)
  create(@Body() body: { action: string; description?: string }) {
    return { message: 'Permission baru berhasil dibuat', data: body };
  }

  @Patch(':id')
  @Permissions('permission:update')
  // DISESUAIKAN: Menggunakan @Param() dan @Body() dengan huruf kapital
  update(@Param('id') id: string, @Body() body: any) {
    return { message: `Permission ID ${id} berhasil diperbarui` };
  }

  @Delete(':id')
  @Permissions('permission:delete')
  // DISESUAIKAN: Menggunakan @Param() dengan huruf kapital
  remove(@Param('id') id: string) {
    return { message: `Permission ID ${id} berhasil dihapus` };
  }
}