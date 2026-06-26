import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersRepository {
    // Menyuntikkan koneksi database Prisma
    constructor(private readonly prisma: PrismaService) { }

    // Menarik semua data pengguna yang belum dihapus lunak
    async findAll() {
        return this.prisma.user.findMany({
            where: { deletedAt: null },
            select: { id: true, email: true, name: true, createdAt: true },
        });
    }

    // Mengambil satu data pengguna berdasarkan email
    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email, deletedAt: null },
        });
    }

    // Mengambil satu data pengguna berdasarkan ID unik
    async findById(id: string) {
        return this.prisma.user.findUnique({
            where: { id, deletedAt: null },
            select: { id: true, email: true, name: true, createdAt: true },
        });
    }

    // Menyimpan entitas data pengguna baru ke database
    async create(data: Prisma.UserCreateInput) {
        return this.prisma.user.create({
            data,
            select: { id: true, email: true, name: true, createdAt: true },
        });
    }

    // Memperbarui rekor data pengguna lama
    async update(id: string, data: Prisma.UserUpdateInput) {
        return this.prisma.user.update({
            where: { id },
            data,
            select: { id: true, email: true, name: true, updatedAt: true },
        });
    }
}