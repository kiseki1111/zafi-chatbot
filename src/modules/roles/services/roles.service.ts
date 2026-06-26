import { ConflictException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RolesRepository } from '../repositories/roles.repository';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';

@Injectable()
export class RolesService {
    // Menyuntikkan repositori peran
    constructor(private readonly rolesRepository: RolesRepository) { }

    // Logika bisnis mengambil semua peran
    async getAllRoles() {
        return this.rolesRepository.findAll();
    }

    // Logika bisnis mengambil satu peran berdasarkan ID
    async getRoleById(id: string) {
        const role = await this.rolesRepository.findById(id);
        if (!role) throw new NotFoundException('Data peran tidak ditemukan.');
        return role;
    }

    // Logika bisnis pembuatan peran dengan validasi keunikan nama
    async createRole(dto: CreateRoleDto) {
        const existingRole = await this.rolesRepository.findByName(dto.name);
        if (existingRole) throw new ConflictException('Nama peran tersebut sudah terdaftar di dalam sistem.');

        return this.rolesRepository.create({
            name: dto.name,
            description: dto.description,
        });
    }

    // Logika bisnis pembaruan data peran
    async updateRole(id: string, dto: UpdateRoleDto) {
        const role = await this.getRoleById(id);

        // Baris Kompleks: Mencegah perubahan nama pada peran vital agar tidak merusak susunan sistem otorisasi global
        if (role.name === 'SUPER_ADMIN' && dto.name && dto.name !== 'SUPER_ADMIN') {
            throw new BadRequestException('Nama peran SUPER_ADMIN bersifat absolut dan tidak dapat diubah.');
        }

        return this.rolesRepository.update(id, {
            name: dto.name,
            description: dto.description,
        });
    }

    // Logika bisnis penghapusan peran dengan proteksi pengaman
    async deleteRole(id: string) {
        const role = await this.getRoleById(id);

        // Baris Kompleks: Memblokir aksi hapus pada peran SUPER_ADMIN guna mencegah sistem terkunci total (deadlock)
        if (role.name === 'SUPER_ADMIN') {
            throw new BadRequestException('Peran SUPER_ADMIN sistem tidak boleh dihapus secara permanen.');
        }

        return this.rolesRepository.delete(id);
    }
}