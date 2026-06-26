import { Controller, Post, Body, Ip, Headers, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

@Controller('api/v1/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() loginDto: LoginDto,
        @Ip() ip: string,
        @Headers('user-agent') userAgent: string
    ) {
        return this.authService.login(loginDto, ip, userAgent);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(@Req() req: any) {
        return this.authService.logout(req.user.sub);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Body() body: { userId: string, refreshTokenPlain: string }) {
        return this.authService.refreshTokens(body.userId, body.refreshTokenPlain);
    }
}
