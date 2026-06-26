import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RolesRepository {
    // Menyuntikkan layanan Prisma untuk koneksi database
    constructor(private readonly prisma: PrismaService) { }

    // Menarik semua data peran dari database
    async findAll() {
        return this.prisma.role.findMany({
            include: {
                _count: { select: { users: true, permissions: true } } // Menampilkan jumlah relasi aktif secara efisien memori
            }
        });
    }

    // Mencari satu peran berdasarkan nama uniknya
    async findByName(name: string) {
        return this.prisma.role.findUnique({
            where: { name },
        });
    }

    // Mencari satu peran berdasarkan ID unik UUID
    async findById(id: string) {
        return this.prisma.role.findUnique({
            where: { id },
        });
    }

    // Membuat rekor peran baru di database
    async create(data: Prisma.RoleCreateInput) {
        return this.prisma.role.create({ data });
    }

    // Memperbarui data peran
    async update(id: string, data: Prisma.RoleUpdateInput) {
        return this.prisma.role.update({
            where: { id },
            data,
        });
    }

    // Menghapus rekor peran secara permanen dari database
    async delete(id: string) {
        return this.prisma.role.delete({
            where: { id },
        });
    }
}