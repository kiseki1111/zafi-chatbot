import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // 1. Ambil metadata permission yang diminta oleh controller
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // Jika endpoint tidak diberi dekorator @Permissions(), izinkan masuk
        if (!requiredPermissions) {
            return true;
        }

        // 2. Ambil data user hasil ekstraksi JwtAuthGuard
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('Akses ditolak: Identitas pengguna tidak ditemukan.');
        }

        // 3. Query ke PostgreSQL menggunakan nama relasi yang benar sesuai schema ('roles' dan 'permissions')
        const dbUser = await this.prisma.user.findUnique({
            where: { id: user.sub, deletedAt: null },
            include: {
                userRoles: { 
                    include: {
                        role: {
                            include: {
                                permissions: { // Diperbarui dari rolePermissions menjadi permissions
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!dbUser) return false;

        // 4. Flattening struktur data. Menggunakan dbUser.userRoles dan rp.permission.action
        const userPermissions = dbUser.userRoles.flatMap((ur) =>
            ur.role.permissions.map((rp) => rp.permission.name), 
        );

        // 5. Evaluasi: Apakah seluruh permission yang diwajibkan oleh controller sudah dikantongi oleh user?
        const hasPermission = requiredPermissions.every((permission) =>
            userPermissions.includes(permission),
        );

        if (!hasPermission) {
            // Catat log menggunakan kolom yang tersedia di schema (memasukkan data ekstra ke dalam 'details')
            const logDetails = JSON.stringify({
                method: request.method,
                endpoint: request.url,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent']
            });

            await this.prisma.auditLog.create({
                data: {
                    userId: user.sub,
                    action: 'ACCESS_DENIED',
                    module: 'AUTHORIZATION',
                    endpoint: request.url || 'UNKNOWN',
                    ipAddress: request.ip,
                    userAgent: request.headers['user-agent'],
                    status: 'FAILED',
                    details: {
                        method: request.method,
                        endpoint: request.url,
                        ipAddress: request.ip,
                        userAgent: request.headers['user-agent']
                    },
                },
            });

            throw new ForbiddenException('Anda tidak memiliki hak akses yang cukup untuk mengeksekusi aksi ini.');
        }

        return true;
    }
}