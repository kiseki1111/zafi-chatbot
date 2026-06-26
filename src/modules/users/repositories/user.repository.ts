import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';

@Injectable()
export class UsersRepository {
    // Melakukan Dependency Injection untuk menyuntikkan PrismaService secara otomatis [cite: 2354, 2356]
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Mengambil semua data pengguna dengan fitur pencarian, pagination, dan saringan soft delete
     */
    async findAll(query: PaginationQueryDto) {
        try {
        const page = parseInt(query.page || '1', 10);
        const limit = parseInt(query.limit || '10', 10);
        
        // Baris Kompleks: Menghitung jumlah record data yang harus dilewati di dalam database
        const skip = (page - 1) * limit;

        // Menyusun objek kriteria penyaringan data
        const whereCondition: any = {
            deletedAt: null, // Baris Kritis: Memastikan user yang sudah di-soft-delete tidak akan muncul [cite: 2451]
        };

        // Baris Kompleks: Jika parameter search dikirim, terapkan filter 'OR' untuk name atau email (Case Insensitive)
        if (query.search) {
            whereCondition.OR = [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        // Baris Kompleks: Menjalankan dua operasi query secara paralel (Hitung Total & Ambil Potongan Data) untuk efisiensi memori
        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
            where: whereCondition,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }, // Menampilkan data pendaftaran terbaru terlebih dahulu
            }),
            this.prisma.user.count({ where: whereCondition }),
        ]);

        // Mengembalikan payload sukses yang dibungkus format spesifikasi metadata dokumen teknis Anda [cite: 2473]
        return {
            data,
            meta: {
            page,
            limit,
            total,
            },
        };
        } catch (error) {
        throw new InternalServerErrorException('Gagal mengambil daftar pengguna dari database');
        }
    }

    /**
     * Menyimpan pengguna baru ke dalam database
     */
    async create(dto: CreateUserDto) {
        try {
        return await this.prisma.user.create({
            data: {
            email: dto.email,
            password: dto.passwordPlain, // Catatan: Enkripsi/Hashing Bcrypt akan dilakukan di layer Service [cite: 2433]
            name: dto.name,
            },
        });
        } catch (error) {
        throw new InternalServerErrorException('Gagal menyimpan pengguna baru ke database');
        }
    }

    /**
     * Mencari satu pengguna aktif berdasarkan ID
     */
    async findById(id: string) {
        const user = await this.prisma.user.findFirst({
        where: { id, deletedAt: null },
        });

        if (!user) {
        throw new NotFoundException(`Pengguna dengan ID tersebut tidak ditemukan`);
        }
        return user;
    }

    /**
     * Mencari satu pengguna berdasarkan alamat email (Untuk validasi pengecekan duplikasi)
     */
    async findByEmail(email: string) {
        return await this.prisma.user.findFirst({
        where: { email, deletedAt: null },
        });
    }

    /**
     * Memperbarui profil data pengguna
     */
    async update(id: string, dto: UpdateUserDto) {
        await this.findById(id); // Memastikan user-nya ada dan aktif terlebih dahulu
        try {
        return await this.prisma.user.update({
            where: { id },
            data: dto,
        });
        } catch (error) {
        throw new InternalServerErrorException('Gagal memperbarui data pengguna');
        }
    }

    /**
     * Menerapkan Fitur Soft Delete Keamanan Tingkat Enterprise [cite: 2391, 2451]
     */
    async softDelete(id: string) {
        await this.findById(id); // Memastikan user-nya ada dan belum dihapus
        try {
        // Baris Kritis: Mengubah data deletedAt dengan waktu saat ini alih-alih memanggil operasi delete fisik [cite: 2451]
        await this.prisma.user.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        return { success: true };
        } catch (error) {
        throw new InternalServerErrorException('Gagal melakukan penandaan penghapusan pengguna');
        }
    }
}