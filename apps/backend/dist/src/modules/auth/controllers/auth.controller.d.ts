import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
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
        };
    }>;
    googleLogin(body: {
        idToken: string;
    }, ip: string, userAgent: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            roles: string[];
            division: null;
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
