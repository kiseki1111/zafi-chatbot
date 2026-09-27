import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User unauthenticated');
    }

    if (!user.tenantId && !user.roles?.includes('superadmin')) {
      throw new ForbiddenException(
        'Akses ditolak: Akun Anda tidak terhubung dengan tenant manapun.',
      );
    }

    return user.tenantId;
  },
);
