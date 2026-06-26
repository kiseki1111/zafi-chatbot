import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoginDto } from '../dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    //Fungsi Login Utama mematuhi Security Hardening Layer TDD
    async login(dto: LoginDto, ipAddress: string, userAgent: string) {
        //Cari user berdasarkan email memanfaatkan relasi userRoles resmi
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email, deletedAt: null },
            include: {
                userRoles: {
                    include: { role: true }
                }
            }
        });

        //Verifikasi kredensial menggunakan Bcrypt dengan work factor yang aman
        if (!user || !(await bcrypt.compare(dto.passwordPlain, user.password))) {
            //Catat kegagalan ke repositori AuditLog independen secara immutable
            await this.prisma.auditLog.create({
                data: {
                    action: 'AUTH_LOGIN_FAILED',
                    module: 'AUTHENTICATION',
                    endpoint: 'POST /auth/login',
                    ipAddress,
                    userAgent,
                    status: 'FAILED',
                    details: { emailAttempt: dto.email, reason: 'Kata sandi atau email keliru' }
                },
            });
            throw new UnauthorizedException('Alamat email atau password yang Anda masukkan keliru.');
        }

        //Ekstraksi seluruh kode peran yang dikantongi pengguna untuk payload JWT
        const userRolesArray = user.userRoles.map((ur) => ur.role.name);
        const jwtPayload = { sub: user.id, email: user.email, roles: userRolesArray };

        //Penerbitan pasangan token
        const accessToken = await this.jwtService.signAsync(jwtPayload, {
            secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
            expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRES') || '15m') as any,
        });

        const refreshTokenPlain = await this.jwtService.signAsync({ jti: Date.now().toString(), sub: user.id }, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES') || '30d') as any,
        });

        //Mengamankan Refresh Token murni dengan Hashing sebelum masuk ke PostgreSQL
        const hashedRefreshToken = await bcrypt.hash(refreshTokenPlain, 10);

        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: hashedRefreshToken, // Patuh penuh pada kolom tokenHash resmi
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Sesi aktif terkunci 30 hari
            },
        });

        //Catat log kesuksesan otentikasi masuk sistem
        await this.prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'AUTH_LOGIN_SUCCESS',
                module: 'AUTHENTICATION',
                endpoint: 'POST /auth/login',
                ipAddress,
                userAgent,
                status: 'SUCCESS',
            },
        });

        return {
            accessToken,
            refreshToken: refreshTokenPlain,
            user: { id: user.id, email: user.email, name: user.name }
        };
    }

    //Fungsi Rotasi Token (Refresh Tokens)
    async refreshTokens(userId: string, refreshTokenPlain: string) {
        //Ambil hash token dari database
        const refreshTokenRecord = await this.prisma.refreshToken.findFirst({
            where: { userId },
        });

        if (!refreshTokenRecord || !(await bcrypt.compare(refreshTokenPlain, refreshTokenRecord.tokenHash))) {
            throw new UnauthorizedException('Sesi tidak valid.');
        }

        //Jika valid, hapus token lama (Rotasi Tunggal)
        await this.prisma.refreshToken.delete({
            where: { id: refreshTokenRecord.id },
        });

        //Ambil data user
        const user = await this.prisma.user.findUnique({
            where: { id: userId, deletedAt: null },
            include: { userRoles: { include: { role: true } } }
        });

        if (!user) {
            throw new UnauthorizedException('Pengguna tidak ditemukan.');
        }

        const userRolesArray = user.userRoles.map((ur) => ur.role.name);
        const jwtPayload = { sub: user.id, email: user.email, roles: userRolesArray };

        //Terbitkan token baru
        const newAccessToken = await this.jwtService.signAsync(jwtPayload, {
            secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
            expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRES') || '15m') as any,
        });

        const newRefreshTokenPlain = await this.jwtService.signAsync({ jti: Date.now().toString(), sub: user.id }, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES') || '30d') as any,
        });

        const hashedRefreshToken = await bcrypt.hash(newRefreshTokenPlain, 10);

        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: hashedRefreshToken,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshTokenPlain,
        };
    }

    //Fungsi Keluar Sistem mematuhi Siklus Rotasi Token Tunggal
    async logout(userId: string) {
        // Membersihkan sesi aktif di database agar token tidak bisa disalahgunakan
        await this.prisma.refreshToken.deleteMany({
            where: { userId },
        });

        return { success: true, message: 'Anda telah berhasil keluar dari sistem.' };
    }
}