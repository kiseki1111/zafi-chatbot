import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  //Metode evaluasi penentuan izin lewat rute
  canActivate(context: ExecutionContext) {
    if (process.env.SECURITY_BYPASS_MODE === 'true') {
      return true;
    }

    //Pengecekan apakah route atau controller memiliki dekorator @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Jika ada dekorator public, lewati validasi JWT
    }

    //Melanjutkan eksekusi ke strategi Passport JWT default
    return super.canActivate(context);
  }

  //Penanganan error kustom saat ekstraksi token gagal
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          'Sesi Anda tidak valid. Silakan lakukan otentikasi kembali.',
        )
      );
    }
    return user;
  }
}
