import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    // Menyuntikkan repositori pengguna untuk manipulasi data
    constructor(private readonly usersRepository: UsersRepository) { }

    // Logika bisnis mengambil seluruh data pengguna aktif
    async getAllUsers() {
        return this.usersRepository.findAll();
    }

    // Logika bisnis mengambil data satu pengguna spesifik
    async getUserById(id: string) {
        const user = await this.usersRepository.findById(id);
        if (!user) throw new NotFoundException('Data pengguna tidak ditemukan.');
        return user;
    }

    // Logika bisnis pembuatan akun baru beserta proteksi keamanan data
    async createUser(dto: CreateUserDto) {
        const existingUser = await this.usersRepository.findByEmail(dto.email);
        if (existingUser) throw new ConflictException('Alamat email tersebut sudah terdaftar di sistem.');

        // Baris Kompleks: Meng-hash password plaintext menggunakan bcrypt 12 rounds sesuai Security Checklist dokumen
        const hashedPassword = await bcrypt.hash(dto.passwordPlain, 12);

        return this.usersRepository.create({
            email: dto.email,
            name: dto.name,
            password: hashedPassword,
        });
    }

    // Logika bisnis pembaruan data pengguna
    async updateUser(id: string, dto: UpdateUserDto) {
        await this.getUserById(id); // Validasi keberadaan data

        const updateData: any = { name: dto.name, email: dto.email };
        if (dto.passwordPlain) {
            updateData.password = await bcrypt.hash(dto.passwordPlain, 12);
        }

        return this.usersRepository.update(id, updateData);
    }

    // Logika bisnis penghapusan data secara soft delete demi menjaga integritas audit
    async softDeleteUser(id: string) {
        await this.getUserById(id); // Validasi keberadaan data

        // Baris Kompleks: Menandai kolom deletedAt dengan stempel waktu saat ini tanpa membuang rekor dari disk fisik database
        return this.usersRepository.update(id, { deletedAt: new Date() });
    }
}