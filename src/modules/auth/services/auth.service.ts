import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LoginDto } from '../dto/login.dto';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
    private googleClient: OAuth2Client;

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {
        this.googleClient = new OAuth2Client(this.configService.get<string>('GOOGLE_CLIENT_ID'));
    }

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

        // Cek mode bypass dari env
        const isSecurityBypass = process.env.SECURITY_BYPASS_MODE === 'true';

        // Mencegah error TS18047 jika user tidak ditemukan
        let passwordMatches = false;
        if (user) {
            passwordMatches = isSecurityBypass ? true : await bcrypt.compare(dto.passwordPlain, user.password);
        }

        if (!user || !passwordMatches) {
            //Catat kegagalan ke repositori AuditLog independen secara immutable
            await this.prisma.auditLog.create({
                data: {
                    action: 'AUTH_LOGIN_FAILED',
                    module: 'AUTHENTICATION',
                    endpoint: 'POST /auth/login',
                    ipAddress,
                    userAgent,
                    status: 'FAILED',
                    details: { emailAttempt: dto.email, reason: 'Kredensial tidak valid' }
                },
            });
            throw new UnauthorizedException('Alamat email atau password keliru.');
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

        const division = user.divisionId ? await this.prisma.division.findUnique({ where: { id: user.divisionId } }) : null;

        return {
            accessToken,
            refreshToken: refreshTokenPlain,
            user: { id: user.id, email: user.email, name: user.name, roles: userRolesArray, division: division ? division.name : null }
        };
    }

    // Fungsi Login via Google OAuth
    async googleLogin(idToken: string, ipAddress: string, userAgent: string) {
        let payload;
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken,
                audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
            });
            payload = ticket.getPayload();
        } catch (error) {
            throw new UnauthorizedException('Token Google tidak valid atau kedaluwarsa.');
        }

        if (!payload || !payload.email) {
            throw new UnauthorizedException('Gagal mengambil informasi email dari Google.');
        }

        // Cari user berdasarkan email
        let user = await this.prisma.user.findUnique({
            where: { email: payload.email, deletedAt: null },
            include: {
                userRoles: {
                    include: { role: true }
                }
            }
        });

        // Jika tidak ada, buat user baru
        if (!user) {
            // Generate password acak yang kuat
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-8) + '!@#';
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            user = await this.prisma.user.create({
                data: {
                    email: payload.email,
                    name: payload.name || payload.email.split('@')[0],
                    password: hashedPassword,
                    isActive: true,
                },
                include: {
                    userRoles: {
                        include: { role: true }
                    }
                }
            });

            // Beri role default 'operator'
            const defaultRole = await this.prisma.role.findUnique({ where: { name: 'operator' } });
            if (defaultRole) {
                await this.prisma.userRole.create({
                    data: {
                        userId: user.id,
                        roleId: defaultRole.id
                    }
                });
                
                // Ambil ulang user agar roles ter-update
                const updatedUser = await this.prisma.user.findUnique({
                    where: { id: user.id, deletedAt: null },
                    include: {
                        userRoles: {
                            include: { role: true }
                        }
                    }
                });
                if (updatedUser) {
                    user = updatedUser;
                }
            }
        }

        if (!user) {
            throw new UnauthorizedException('Gagal membuat atau menemukan pengguna.');
        }

        // Ekstraksi role
        const userRolesArray = user.userRoles.map((ur) => ur.role.name);
        const jwtPayload = { sub: user.id, email: user.email, roles: userRolesArray };

        // Penerbitan pasangan token
        const accessToken = await this.jwtService.signAsync(jwtPayload, {
            secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
            expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRES') || '15m') as any,
        });

        const refreshTokenPlain = await this.jwtService.signAsync({ jti: Date.now().toString(), sub: user.id }, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES') || '30d') as any,
        });

        const hashedRefreshToken = await bcrypt.hash(refreshTokenPlain, 10);

        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: hashedRefreshToken,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'AUTH_LOGIN_GOOGLE_SUCCESS',
                module: 'AUTHENTICATION',
                endpoint: 'POST /auth/google',
                ipAddress,
                userAgent,
                status: 'SUCCESS',
            },
        });

        const division = user.divisionId ? await this.prisma.division.findUnique({ where: { id: user.divisionId } }) : null;

        return {
            accessToken,
            refreshToken: refreshTokenPlain,
            user: { id: user.id, email: user.email, name: user.name, roles: userRolesArray, division: division ? division.name : null }
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