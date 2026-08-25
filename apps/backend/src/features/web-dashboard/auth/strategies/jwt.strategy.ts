import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        super({
            //ekstraksi bearer token dari header http authorization secara stateless
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            //membaca kunci rahasia dari env
            secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || 'fallback_secret_key_sementara',
        });
    }

    //memetakan isi payload token ke dalam objek request (req.user)
    async validate(payload: any) {
        return { sub: payload.sub, email: payload.email, roles: payload.roles };
    }
}