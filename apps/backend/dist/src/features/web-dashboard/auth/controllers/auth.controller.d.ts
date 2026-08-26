import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto, ip: string, userAgent: string): Promise<{
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
    register(registerDto: RegisterDto, ip: string, userAgent: string): Promise<{
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
    logout(req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    refresh(body: {
        userId: string;
        refreshTokenPlain: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
}
