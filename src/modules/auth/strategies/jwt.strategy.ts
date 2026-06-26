import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        super({
            // Ekstraksi Bearer token dari header HTTP Authorization secara stateless
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            // Perbaikan Kritis: Membaca kunci rahasia dari panel kendali terpusat 'jwt'
            secretOrKey: configService.get<string>('jwt.accessSecret') || 'fallback_secret_key_sementara',
        });
    }

    // Memetakan isi payload token ke dalam objek request (req.user)
    async validate(payload: any) {
        return { sub: payload.sub, email: payload.email, roles: payload.roles };
    }
}