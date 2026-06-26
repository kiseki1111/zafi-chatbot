import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    // Metode evaluasi penentuan izin lewat rute
    canActivate(context: ExecutionContext) {
        // Baris Kompleks: Memeriksa apakah rute handler atau kelas dihiasi dekorator @Public() via reflector
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true; // Izinkan akses langsung tanpa validasi token
        }

        return super.canActivate(context);
    }

    // Penanganan error kustom saat ekstraksi token gagal
    handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            throw err || new UnauthorizedException('Sesi Anda tidak valid. Silakan lakukan otentikasi kembali.');
        }
        return user;
    }
}