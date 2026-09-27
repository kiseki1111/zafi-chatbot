import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

// Ekstraktor token dari cookie 'access_token' atau header Bearer
const cookieExtractor = (req: any): string | null => {
  if (req?.cookies?.access_token) {
    return req.cookies.access_token;
  }
  if (req?.headers?.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      // Ekstraksi ganda: mendukung Header Authorization Bearer maupun HttpOnly Cookie
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      // Membaca kunci rahasia dari env
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') ||
        'rahasia_akses_sangat_kuat_super_aman_123!',
    });
  }

  // Memetakan isi payload token ke dalam objek request (req.user)
  async validate(payload: any) {
    return {
      sub: payload.sub,
      email: payload.email,
      roles: payload.roles || [],
      tenantId: payload.tenantId || null,
    };
  }
}
