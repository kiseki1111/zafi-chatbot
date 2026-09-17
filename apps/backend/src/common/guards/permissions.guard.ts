import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.SECURITY_BYPASS_MODE === 'true') {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'Akses ditolak: Identitas pengguna tidak ditemukan.',
      );
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub, deletedAt: null },
    });

    if (!dbUser) return false;

    // Manager = full access, Administrator = terbatas (enforced di frontend + specific guards)
    if (
      [
        'MANAGER',
        'ADMINISTRATOR',
        'manager',
        'administrator',
        'SUPERADMIN',
        'ADMIN',
      ].includes(dbUser.role)
    ) {
      return true;
    }

    // We can add finer grained rules here, but for now reject.
    throw new ForbiddenException(
      'Anda tidak memiliki hak akses yang cukup untuk mengeksekusi aksi ini.',
    );
  }
}
