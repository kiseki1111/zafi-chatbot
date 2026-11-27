import {
  Injectable,
  Logger,
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
  private readonly logger = new Logger(AuthService.name);

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

    const hasConsoleAccount = consoleResult?.valid === true;
    const isEntitled = hasConsoleAccount && consoleResult?.entitled === true;

    if (!hasConsoleAccount) {
      // Fallback akun pra-SSO: Console belum/tidak mengenali email ini, TAPI
      // akun lokal lama (sebelum SSO dibangun) masih punya hash password sendiri -- cocokkan ke situ
      // saja, tanpa membuat user baru atau mempercayai pihak luar apapun untuk identitas ini.
      const fallbackSession = await this.tryLocalPasswordFallback(
        dto.email,
        dto.passwordPlain,
        ipAddress,
        userAgent,
      );
      if (fallbackSession) return fallbackSession;

      // Console: kredensial salah atau tidak terjangkau dan tidak cocok lokal
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
            reason: 'Kredensial tidak valid di ZAF Console maupun database lokal',
          },
        },
      });
      throw new UnauthorizedException('Alamat email atau password keliru.');
    }

    // Anti-hijack: resolve user lokal SEBELUM membuat efek samping apapun (auto-provisioning tenant
    // baru + lapor ke Console) -- supaya percobaan yang akhirnya ditolak tidak sempat mengubah state
    // Console/chatbot sama sekali.
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { tenant: true },
    });

    let tenantId = consoleResult.chatbotTenantId;
    if (!tenantId) {
      const sameConsoleCustomer =
        Boolean(consoleResult.customerId) &&
        existingUser?.tenant?.consoleCustomerId === consoleResult.customerId;

      if (existingUser && !sameConsoleCustomer) {
        // Console belum pernah menautkan customer ini KE tenant chatbot apapun, TAPI email ini
        // sudah dipakai user lokal (tenant lain, atau tenant lama pra-SSO) -- auto-provisioning
        // tenant baru di sini pasti akan bertentangan dengan tenant yang sudah ada. Staf harus
        // menautkan manual lewat Console (linkTenant) ke tenant yang benar; jangan pernah membuat
        // tenant baru lalu melaporkannya ke Console di sini, baru menolak login setelahnya.
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
              reason: 'Email sudah dipakai user lokal di tenant lain; perlu tautan manual staf',
            },
          },
        });
        throw new UnauthorizedException('Email ini sudah dipakai akun chatbot lain. Hubungi tim ZAF.');
      }
      // Ala Google: begitu Console bilang entitled (atau sudah punya tenant untuk customerId yang sama
      // saat mode preview unsubscribed), pakai/buat tenant untuk customerId ini.
      tenantId = sameConsoleCustomer && existingUser?.tenantId
        ? existingUser.tenantId
        : await this.autoProvisionTenant(
            consoleResult.customerId!,
            consoleResult.customerName,
          );
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new ForbiddenException(
        'Tenant chatbot untuk pelanggan ini belum disiapkan. Hubungi administrator.',
      );
    }

    // Anti-hijack (jalur chatbotTenantId sudah tertaut): email ini tidak boleh dipakai user lokal
    // di tenant LAIN dari yang ditautkan Console -- jangan pernah dipindah diam-diam.
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

    return this.issueSession(user, ipAddress, userAgent, 'POST /auth/login', isEntitled);
  }

  /**
   * Fallback khusus akun pra-SSO: dipanggil HANYA saat Console menolak/tidak mengenali email ini.
   * Tidak pernah membuat/mengubah user atau tenant apapun -- murni bcrypt.compare ke hash yang
   * sudah ada di DB chatbot sejak sebelum SSO dibangun. Kembalikan null (bukan throw) kalau tidak
   * cocok, supaya caller lanjut ke jalur tolak + audit log Console seperti biasa.
   */
  private async tryLocalPasswordFallback(
    email: string,
    passwordPlain: string,
    ipAddress: string,
    userAgent: string,
  ) {
    let localUser;
    try {
      localUser = await this.prisma.user.findUnique({
        where: { email },
        include: { tenant: true },
      });
    } catch (err: any) {
      // Gagal-aman: kalau skema DB belum tersinkron (mis. migrasi belum jalan di server ini),
      // JANGAN sampai 500 ke pengguna -- cukup anggap fallback tidak tersedia, lanjut ke jalur
      // tolak Console seperti biasa (perilaku sebelum fallback ini dibuat).
      this.logger.error(`[AuthService] Fallback lokal gagal query user: ${err?.message || err}`);
      return null;
    }
    if (!localUser?.password) return null; // user SSO (password '') tidak punya hash untuk dicocokkan

    const matches = await bcrypt.compare(passwordPlain, localUser.password);
    if (!matches) return null;

    if (localUser.role !== 'superadmin' && localUser.tenant) {
      const meta = (localUser.tenant.metadata as any) || {};
      if (meta.isTrial && meta.trialExpiresAt && new Date(meta.trialExpiresAt).getTime() < Date.now()) {
        throw new ForbiddenException(
          'Masa trial 14 hari akun Anda telah berakhir. Silakan hubungi tim kami untuk memperpanjang atau upgrade ke paket berbayar.',
        );
      }
    }

    return this.issueSession(localUser, ipAddress, userAgent, 'POST /auth/login', true);
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
    if (!customerId) {
      throw new ForbiddenException(
        'Data pelanggan ZAF Console tidak lengkap untuk provisioning tenant.',
      );
    }
    let tenant = await this.prisma.tenant.findUnique({
      where: { consoleCustomerId: customerId },
    });
    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: { name: customerName || 'Toko Baru', consoleCustomerId: customerId },
      });
    }
    if (!tenant?.id) {
      throw new ForbiddenException(
        'Gagal menyiapkan tenant untuk pelanggan ini.',
      );
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
    hasSubscription: boolean = true,
  ) {
    const userRolesArray = [user.role];
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      roles: userRolesArray,
      tenantId: user.tenantId,
      hasSubscription,
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
        hasSubscription,
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
        hasSubscription: true,
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
