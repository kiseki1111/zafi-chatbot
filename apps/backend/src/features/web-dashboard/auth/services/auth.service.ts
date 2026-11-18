import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import * as bcrypt from 'bcrypt';
import axios from 'axios';

/** Bentuk respons POST /api/integration/v1/sso/verify di ZAF Console (source of truth). */
interface ConsoleSsoVerifyResult {
  valid: boolean;
  entitled: boolean;
  customerId: string | null;
  customerName: string | null;
  chatbotTenantId: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  //Fungsi Login Utama: Console adalah source of truth untuk semua kredensial
  async login(dto: LoginDto, ipAddress: string, userAgent: string) {
    const consoleResult = await this.verifyWithConsole(
      dto.email,
      dto.passwordPlain,
      ipAddress,
    );

    if (!consoleResult?.valid || !consoleResult.entitled) {
      // Console: kredensial salah, tidak entitled (tidak subscribe Chatbot), atau tidak terjangkau
      await this.prisma.auditLog.create({
        data: {
          action: 'AUTH_LOGIN_FAILED',
          module: 'AUTHENTICATION',
          endpoint: 'POST /auth/login',
          ipAddress,
          userAgent,
          status: 'FAILED',
          details: {
            emailAttempt: dto.email,
            reason: !consoleResult?.valid
              ? 'Kredensial tidak valid di ZAF Console'
              : 'Tidak sedang berlangganan ZAF Chatbot',
          },
        },
      });
      throw new UnauthorizedException('Alamat email atau password keliru.');
    }

    // Ala Google: begitu Console bilang entitled, tenant dibuat otomatis kalau ini login pertama
    // kali -- tidak perlu staf menautkan manual (lihat linkTenant di Console).
    const tenantId =
      consoleResult.chatbotTenantId ??
      (await this.autoProvisionTenant(
        consoleResult.customerId!,
        consoleResult.customerName,
      ));

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new ForbiddenException(
        'Tenant chatbot untuk pelanggan ini belum disiapkan. Hubungi administrator.',
      );
    }

    // Anti-hijack: email ini tidak boleh sudah dipakai user lokal di tenant LAIN (data lama
    // pra-SSO, atau dua konsumen Console kebetulan punya email sama) -- jangan pernah dipindah diam-diam.
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser && existingUser.tenantId !== tenantId) {
      throw new UnauthorizedException('Email ini sudah dipakai akun chatbot lain. Hubungi tim ZAF.');
    }

    const user = await this.prisma.user.upsert({
      where: { email: dto.email },
      update: { tenantId },
      create: {
        email: dto.email,
        name: dto.email.split('@')[0],
        password: '', // ponytail: password tidak disimpan, verifikasi via Console saja
        role: 'manager',
        tenantId,
      },
      include: { tenant: true },
    });

    // ponytail: validasi kedaluwarsa akun trial 14 hari
    if (user.role !== 'superadmin' && user.tenant) {
      const meta = (user.tenant.metadata as any) || {};
      if (meta.isTrial && meta.trialExpiresAt) {
        const isExpired = new Date(meta.trialExpiresAt).getTime() < Date.now();
        if (isExpired) {
          throw new ForbiddenException(
            'Masa trial 14 hari akun Anda telah berakhir. Silakan hubungi tim kami untuk memperpanjang atau upgrade ke paket berbayar.',
          );
        }
      }
    }

    return this.issueSession(user, ipAddress, userAgent, 'POST /auth/login');
  }

  // Verifikasi kredensial ke Console: source of truth untuk semua login. Null = fitur federasi
  // mati (CONSOLE_SSO_KEY belum diset) atau Console tidak terjangkau -- tidak ada fallback lokal.
  private async verifyWithConsole(
    email: string,
    passwordPlain: string,
    ipAddress: string,
  ): Promise<ConsoleSsoVerifyResult | null> {
    const ssoKey = this.configService.get<string>('CONSOLE_SSO_KEY');
    if (!ssoKey) return null;

    const consoleApiUrl =
      this.configService.get<string>('CONSOLE_API_URL') ||
      'http://localhost:17342';

    try {
      const res = await axios.post<ConsoleSsoVerifyResult>(
        `${consoleApiUrl}/api/integration/v1/sso/verify`,
        { email, password: passwordPlain },
        {
          timeout: 3000,
          headers: { Authorization: `Bearer ${ssoKey}`, 'CF-Connecting-IP': ipAddress },
        },
      );
      return res.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Auto-provisioning ala Google: produk lain (Chatbot) membuat "ruang" sendiri begitu identitas
   * dikenal + entitled, tanpa staf harus menautkan manual. Idempotent lewat consoleCustomerId --
   * kalau tenant sudah pernah dibuat (mis. laporan ke Console sebelumnya gagal karena network),
   * dipakai ulang, bukan dibuat dobel.
   */
  private async autoProvisionTenant(
    customerId: string,
    customerName: string | null,
  ): Promise<string> {
    let tenant = await this.prisma.tenant.findUnique({
      where: { consoleCustomerId: customerId },
    });
    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: { name: customerName || 'Toko Baru', consoleCustomerId: customerId },
      });
    }
    // Lapor ke Console supaya login berikutnya langsung dapat chatbotTenantId (tanpa auto-provision
    // ulang). Gagal lapor tidak boleh membatalkan login yang sudah berhasil -- percobaan berikutnya
    // akan retry otomatis lewat idempotency di atas.
    await this.notifyConsoleTenantLinked(customerId, tenant.id).catch(() => null);
    return tenant.id;
  }

  /** Dikabarkan ke Console setiap kali tenant baru dibuat (idempotent di sisi Console). */
  private async notifyConsoleTenantLinked(customerId: string, tenantId: string): Promise<void> {
    const ssoKey = this.configService.get<string>('CONSOLE_SSO_KEY');
    if (!ssoKey) return;
    const consoleApiUrl =
      this.configService.get<string>('CONSOLE_API_URL') || 'http://localhost:17342';
    await axios.post(
      `${consoleApiUrl}/api/integration/v1/sso/link-tenant`,
      { customerId, chatbotTenantId: tenantId },
      { timeout: 3000, headers: { Authorization: `Bearer ${ssoKey}` } },
    );
  }


  /** Terbitkan pasangan token + simpan refresh token + catat audit log sukses (dipakai login & SSO). */
  private async issueSession(
    user: { id: string; email: string; name: string | null; role: string; tenantId: string | null },
    ipAddress: string,
    userAgent: string,
    endpoint: string,
  ) {
    const userRolesArray = [user.role];
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      roles: userRolesArray,
      tenantId: user.tenantId,
    };

    const accessToken = await this.jwtService.signAsync(jwtPayload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRES') ||
        '15m') as any,
    });

    const refreshTokenPlain = await this.jwtService.signAsync(
      { jti: Date.now().toString(), sub: user.id },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES') ||
          '30d') as any,
      },
    );

    const hashedRefreshToken = await bcrypt.hash(refreshTokenPlain, 10);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'AUTH_LOGIN_SUCCESS',
        module: 'AUTHENTICATION',
        endpoint,
        ipAddress,
        userAgent,
        status: 'SUCCESS',
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenPlain,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: userRolesArray,
        division: null,
        tenantId: user.tenantId,
      },
    };
  }

  // Fungsi Pendaftaran (Dev)
  async register(dto: RegisterDto, ipAddress: string, userAgent: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('Email sudah terdaftar.');
    }

    const hashedPassword = await bcrypt.hash(dto.passwordPlain, 10);

    // ponytail: atomic transaction untuk pembuatan tenant & user awal
    const { tenant, user } = await this.prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name: dto.name ? `Toko ${dto.name}` : 'Toko Baru',
          phone: dto.phone,
        },
      });

      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          password: hashedPassword,
          role: 'manager',
          tenantId: newTenant.id,
        },
      });

      return { tenant: newTenant, user: newUser };
    });

    const userRolesArray = [user.role];
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      roles: userRolesArray,
    };

    const accessToken = await this.jwtService.signAsync(jwtPayload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRES') ||
        '15m') as any,
    });

    const refreshTokenPlain = await this.jwtService.signAsync(
      { jti: Date.now().toString(), sub: user.id },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES') ||
          '30d') as any,
      },
    );

    const hashedRefreshToken = await bcrypt.hash(refreshTokenPlain, 10);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'AUTH_REGISTER_SUCCESS',
        module: 'AUTHENTICATION',
        endpoint: 'POST /auth/register',
        ipAddress,
        userAgent,
        status: 'SUCCESS',
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenPlain,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: userRolesArray,
        division: null,
        tenantId: user.tenantId,
      },
    };
  }

  //Fungsi Rotasi Token (Refresh Tokens)
  async refreshTokens(userId: string, refreshTokenPlain: string) {
    //Ambil hash token dari database
    const refreshTokenRecord = await this.prisma.refreshToken.findFirst({
      where: { userId },
    });

    if (
      !refreshTokenRecord ||
      !(await bcrypt.compare(refreshTokenPlain, refreshTokenRecord.tokenHash))
    ) {
      throw new UnauthorizedException('Sesi tidak valid.');
    }

    // SECURITY: cek masa berlaku token — row di DB tidak berarti token masih valid
    if (
      refreshTokenRecord.expiresAt &&
      refreshTokenRecord.expiresAt.getTime() < Date.now()
    ) {
      // Hapus token expired
      await this.prisma.refreshToken
        .delete({ where: { id: refreshTokenRecord.id } })
        .catch(() => null);
      throw new UnauthorizedException('Sesi telah kedaluwarsa.');
    }

    //Jika valid, hapus token lama (Rotasi Tunggal)
    await this.prisma.refreshToken.delete({
      where: { id: refreshTokenRecord.id },
    });

    //Ambil data user
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan.');
    }

    const userRolesArray = [user.role];
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      roles: userRolesArray,
    };

    //Terbitkan token baru
    const newAccessToken = await this.jwtService.signAsync(jwtPayload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRES') ||
        '15m') as any,
    });

    const newRefreshTokenPlain = await this.jwtService.signAsync(
      { jti: Date.now().toString(), sub: user.id },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES') ||
          '30d') as any,
      },
    );

    const hashedRefreshToken = await bcrypt.hash(newRefreshTokenPlain, 10);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshTokenPlain,
    };
  }

  //Fungsi Keluar Sistem mematuhi Siklus Rotasi Token Tunggal
  async logout(userId: string) {
    // Membersihkan sesi aktif di database agar token tidak bisa disalahgunakan
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return {
      success: true,
      message: 'Anda telah berhasil keluar dari sistem.',
    };
  }
}
