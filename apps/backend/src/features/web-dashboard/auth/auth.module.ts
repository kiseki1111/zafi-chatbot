import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
    imports: [
        //mengatur modul passport dengan strategi jwt
        PassportModule.register({ defaultStrategy: 'jwt' }),
        //konfigurasi dinamis diatur manual di dalam service
        JwtModule.register({}), 
    ],
    //mengatur controller auth
    controllers: [AuthController],
    //mengatur provider auth
    providers: [AuthService, JwtStrategy],
    //mengekspor modul passport dan strategi jwt
    exports: [PassportModule, JwtStrategy],
})
export class AuthModule { }