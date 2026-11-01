import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

// Ekstraktor token dari cookie 'access_token', header Bearer, atau query param ?token= (untuk EventSource SSE)
const queryTokenExtractor = (req: any): string | null => {
  if (req?.query?.token && typeof req.query.token === 'string') {
    return req.query.token;
  }
  return null;
};

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
      // Ekstraksi tiga lapis: Header Bearer, HttpOnly Cookie, dan Query param (?token=) untuk SSE
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
        queryTokenExtractor,
      ]),
      ignoreExpiration: false,
      // SECURITY: JWT secret WAJIB dari env. Tidak ada fallback hardcoded —
      // jika JWT_ACCESS_SECRET kosong, server harus gagal startup, bukan pakai secret prediksi.
      secretOrKey: (() => {
        const secret = configService.get<string>('JWT_ACCESS_SECRET');
        if (!secret) {
          throw new Error(
            'JWT_ACCESS_SECRET environment variable wajib diisi. ' +
              'Tidak ada fallback hardcoded untuk alasan keamanan.',
          );
        }
        return secret;
      })(),
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
