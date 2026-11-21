import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma/prisma.service';
import axios from 'axios';

interface TenantHrisConfig {
  baseUrl: string;
  integrationUrl: string;
  apiKey: string;
}

interface ConsoleHrisAccessResponse {
  allowed: boolean;
  hrisUrl: string | null;
  secret: string | null;
  message: string | null;
}

/** Cache resolusi per-tenant sebentar saja -- cukup untuk menghindari memanggil Console di setiap
 * request, tapi tidak lama (akses dicabut/diaktifkan di Console harus terasa cepat). */
const TENANT_HRIS_CACHE_MS = 60_000;

const NOT_CONFIGURED = { success: false, message: 'Integrasi HRIS belum dikonfigurasi untuk perusahaan ini.' };

@Injectable()
export class HrisService {
  private readonly logger = new Logger(HrisService.name);
  private readonly tenantConfigCache = new Map<
    string,
    { value: TenantHrisConfig | null; expiresAt: number }
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Alamat server HRIS + kunci integrasi KHUSUS tenant ini, ditanyakan ke ZAF Console (yang tahu
   * Tenant.consoleCustomerId -> Customer.hrisUrl lewat SSO) -- bukan config global, supaya tenant
   * chatbot A tidak pernah bisa melihat data HRIS tenant B. null = integrasi mati untuk tenant ini
   * (fail-closed), bukan exception, supaya endpoint tetap membalas pesan ramah.
   */
  private async resolveTenantConfig(tenantId: string | null): Promise<TenantHrisConfig | null> {
    if (!tenantId) {
      return null;
    }
    const cached = this.tenantConfigCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const value = await this.fetchTenantConfig(tenantId);
    this.tenantConfigCache.set(tenantId, { value, expiresAt: Date.now() + TENANT_HRIS_CACHE_MS });
    return value;
  }

  private async fetchTenantConfig(tenantId: string): Promise<TenantHrisConfig | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { consoleCustomerId: true },
    });
    if (!tenant?.consoleCustomerId) {
      return null;
    }

    const ssoKey = this.configService.get<string>('CONSOLE_SSO_KEY');
    if (!ssoKey) {
      return null;
    }
    const consoleApiUrl =
      this.configService.get<string>('CONSOLE_API_URL') || 'http://localhost:17342';

    try {
      const res = await axios.get<ConsoleHrisAccessResponse>(
        `${consoleApiUrl}/api/integration/v1/sso/hris-access/${tenant.consoleCustomerId}`,
        { timeout: 4000, headers: { Authorization: `Bearer ${ssoKey}` } },
      );
      const data = res.data;
      if (!data?.allowed || !data.hrisUrl || !data.secret) {
        return null;
      }
      const baseUrl = data.hrisUrl.replace(/\/$/, '');
      return {
        baseUrl: `${baseUrl}/api/assistant`,
        integrationUrl: `${baseUrl}/api/integration/v1/assistant`,
        apiKey: data.secret,
      };
    } catch (err) {
      this.logger.warn(`[HrisService] Gagal resolusi HRIS untuk tenant ${tenantId}: ${err.message}`);
      return null;
    }
  }

  private headers(apiKey: string) {
    return {
      Accept: 'application/json',
      'X-Assistant-Key': apiKey,
    };
  }

  async getHealth(tenantId: string | null) {
    const config = await this.resolveTenantConfig(tenantId);
    if (!config) {
      return { success: false, status: 'DISABLED', system: 'HRIS (belum dikonfigurasi)', totalKaryawanAktif: 0, latencyMs: 0 };
    }
    const start = Date.now();
    try {
      const res = await axios.get(`${config.baseUrl}/health`, {
        headers: this.headers(config.apiKey),
        timeout: 4000,
      });
      const latencyMs = Date.now() - start;
      return {
        success: true,
        status: res.data?.status || 'CONNECTED',
        system: res.data?.system || 'HRIS Laravel 10',
        totalKaryawanAktif: res.data?.total_karyawan_aktif ?? 0,
        latencyMs,
      };
    } catch (err) {
      const latencyMs = Date.now() - start;
      this.logger.warn(`Failed to connect to HRIS: ${err.message}`);
      return {
        success: false,
        status: 'OFFLINE',
        system: 'HRIS Laravel 10 (Not reachable)',
        totalKaryawanAktif: 0,
        latencyMs,
        error: err.message,
      };
    }
  }

  async getEmployeesList(tenantId: string | null) {
    const config = await this.resolveTenantConfig(tenantId);
    if (!config) {
      return { success: false, data: [], message: NOT_CONFIGURED.message };
    }
    try {
      const res = await axios.get(`${config.baseUrl}/karyawan/list`, {
        headers: this.headers(config.apiKey),
        timeout: 4000,
      });
      return res.data;
    } catch (err) {
      return {
        success: false,
        data: [],
        message: err.response?.data?.message || err.message,
      };
    }
  }

  async lookupKaryawan(tenantId: string | null, phone?: string, nik?: string) {
    const config = await this.resolveTenantConfig(tenantId);
    if (!config) {
      return NOT_CONFIGURED;
    }
    try {
      const res = await axios.get(`${config.baseUrl}/karyawan/lookup`, {
        params: { phone, nik },
        headers: this.headers(config.apiKey),
        timeout: 4000,
      });
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || 'Karyawan tidak ditemukan',
      };
    }
  }

  async getCutiBalance(tenantId: string | null, nik: string) {
    const config = await this.resolveTenantConfig(tenantId);
    if (!config) {
      return NOT_CONFIGURED;
    }
    try {
      const res = await axios.get(`${config.baseUrl}/karyawan/${nik}/cuti`, {
        headers: this.headers(config.apiKey),
        timeout: 4000,
      });
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message,
      };
    }
  }

  async getPresensiSummary(tenantId: string | null, nik: string) {
    const config = await this.resolveTenantConfig(tenantId);
    if (!config) {
      return NOT_CONFIGURED;
    }
    try {
      const res = await axios.get(`${config.baseUrl}/karyawan/${nik}/presensi`, {
        headers: this.headers(config.apiKey),
        timeout: 4000,
      });
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message,
      };
    }
  }

  async getSlipGaji(tenantId: string | null, nik: string) {
    const config = await this.resolveTenantConfig(tenantId);
    if (!config) {
      return NOT_CONFIGURED;
    }
    try {
      const res = await axios.get(`${config.baseUrl}/karyawan/${nik}/slip-gaji`, {
        headers: this.headers(config.apiKey),
        timeout: 4000,
      });
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message,
      };
    }
  }

  // ponytail: endpoints integrasi konsol / hub HRD (daily, monthly, requests, employees)
  async getDailyAttendance(tenantId: string | null, date?: string) {
    const config = await this.resolveTenantConfig(tenantId);
    if (!config) {
      return NOT_CONFIGURED;
    }
    try {
      const res = await axios.get(`${config.integrationUrl}/attendance/daily`, {
        params: date ? { date } : {},
        headers: this.headers(config.apiKey),
        timeout: 4000,
      });
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  }

  async getPendingRequests(tenantId: string | null) {
    const config = await this.resolveTenantConfig(tenantId);
    if (!config) {
      return NOT_CONFIGURED;
    }
    try {
      const res = await axios.get(`${config.integrationUrl}/requests`, {
        headers: this.headers(config.apiKey),
        timeout: 4000,
      });
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  }

  /** Log audit platform ZAF (bukan data HRIS pelanggan) -- dijaga superadmin-only di controller. */
  async getRecentAuditLogs() {
    try {
      const logs = await this.prisma.auditLog.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });
      return { success: true, data: logs };
    } catch (err) {
      return { success: false, data: [], message: err.message };
    }
  }

  async getEmployeesSummary(tenantId: string | null) {
    const config = await this.resolveTenantConfig(tenantId);
    if (!config) {
      return NOT_CONFIGURED;
    }
    try {
      const res = await axios.get(`${config.integrationUrl}/employees`, {
        headers: this.headers(config.apiKey),
        timeout: 4000,
      });
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  }
}
