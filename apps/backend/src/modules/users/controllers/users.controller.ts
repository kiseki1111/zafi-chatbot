import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';

// Pengaturan rute dasar dengan awalan api/v1 sesuai cetak biru
@Controller('api/v1/users')
// Baris Kompleks: Mengunci seluruh endpoint di dalam controller ini dengan validasi token JWT dan otorisasi hak akses berbasis RBAC secara berlapis
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
    // Menyuntikkan layanan bisnis pengguna
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @Permissions('user:read') // Pengunci izin granular membaca data
    async findAll() {
        return this.usersService.getAllUsers();
    }

    @Get(':id')
    @Permissions('user:read')
    async findOne(@Param('id') id: string) {
        return this.usersService.getUserById(id);
    }

    @Post()
    @Permissions('user:create') // Pengunci izin granular membuat data
    async create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.createUser(createUserDto);
    }

    @Patch(':id')
    @Permissions('user:update') // Pengunci izin granular memperbarui data
    async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.updateUser(id, updateUserDto);
    }

    @Delete(':id')
    @Permissions('user:delete') // Pengunci izin granular menghapus data
    async remove(@Param('id') id: string) {
        return this.usersService.softDeleteUser(id);
    }
}