import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly configService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    login(dto: LoginDto, ipAddress: string, userAgent: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            roles: string[];
            division: null;
            tenantId: string | null;
        };
    }>;
    register(dto: RegisterDto, ipAddress: string, userAgent: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            roles: string[];
            division: null;
            tenantId: string | null;
        };
    }>;
    refreshTokens(userId: string, refreshTokenPlain: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
