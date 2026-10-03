import {
  Controller,
  Post,
  Body,
  Ip,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';

//mengatur api endpoint untuk otentikasi dan otorisasi
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Batasi percobaan login maksimal 10x per menit per IP (Anti Brute-Force)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto, ip, userAgent);
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return result;
  }

  // Closed-Door Policy: Pendaftaran publik dinonaktifkan
  @Post('register')
  @HttpCode(HttpStatus.FORBIDDEN)
  async register() {
    throw new ForbiddenException(
      'Pendaftaran publik dinonaktifkan. Akun hanya dapat dibuat oleh Superadmin.',
    );
  }

  //mengatur request logout
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    return this.authService.logout(req.user.sub);
  }

  //mengatur request refresh token untuk mendapatkan token akses baru
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { userId: string; refreshTokenPlain: string }) {
    return this.authService.refreshTokens(body.userId, body.refreshTokenPlain);
  }
}
