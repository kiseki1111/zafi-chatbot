import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class HrisService {
  private readonly logger = new Logger(HrisService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const rawUrl =
      this.configService.get<string>('HRIS_API_URL') ||
      process.env.HRIS_API_URL ||
      'http://127.0.0.1:8000/api/assistant';
    this.baseUrl = rawUrl.replace(/\/$/, '');
    // ponytail: tidak ada fallback hardcoded -- kosong = integrasi dianggap mati (fail-closed),
    // bukan diam-diam memakai secret bawaan yang sudah ada di git history kedua repo.
    this.apiKey =
      this.configService.get<string>('HRIS_API_KEY') || process.env.HRIS_API_KEY || '';

    if (!this.apiKey) {
      this.logger.warn('[HrisService] HRIS_API_KEY belum diset -- integrasi HRIS dianggap mati.');
    }
    this.logger.log(`[HrisService] Initialized with baseUrl: ${this.baseUrl}`);
  }

  private isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  private getHeaders() {
    return {
      Accept: 'application/json',
      'X-Assistant-Key': this.apiKey,
    };
  }

  async getHealth() {
    if (!this.isConfigured()) {
      return { success: false, status: 'DISABLED', system: 'HRIS (belum dikonfigurasi)', totalKaryawanAktif: 0, latencyMs: 0 };
    }
    const start = Date.now();
    try {
      const res = await axios.get(`${this.baseUrl}/health`, {
        headers: this.getHeaders(),
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

  async getEmployeesList() {
    if (!this.isConfigured()) {
      return { success: false, data: [], message: 'Integrasi HRIS belum dikonfigurasi.' };
    }
    try {
      const res = await axios.get(`${this.baseUrl}/karyawan/list`, {
        headers: this.getHeaders(),
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

  async lookupKaryawan(phone?: string, nik?: string) {
    if (!this.isConfigured()) {
      return { success: false, message: 'Integrasi HRIS belum dikonfigurasi.' };
    }
    try {
      const res = await axios.get(`${this.baseUrl}/karyawan/lookup`, {
        params: { phone, nik },
        headers: this.getHeaders(),
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

  async getCutiBalance(nik: string) {
    if (!this.isConfigured()) {
      return { success: false, message: 'Integrasi HRIS belum dikonfigurasi.' };
    }
    try {
      const res = await axios.get(`${this.baseUrl}/karyawan/${nik}/cuti`, {
        headers: this.getHeaders(),
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

  async getPresensiSummary(nik: string) {
    if (!this.isConfigured()) {
      return { success: false, message: 'Integrasi HRIS belum dikonfigurasi.' };
    }
    try {
      const res = await axios.get(`${this.baseUrl}/karyawan/${nik}/presensi`, {
        headers: this.getHeaders(),
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

  async getSlipGaji(nik: string) {
    if (!this.isConfigured()) {
      return { success: false, message: 'Integrasi HRIS belum dikonfigurasi.' };
    }
    try {
      const res = await axios.get(`${this.baseUrl}/karyawan/${nik}/slip-gaji`, {
        headers: this.getHeaders(),
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
  async getDailyAttendance(date?: string) {
    if (!this.isConfigured()) {
      return { success: false, message: 'Integrasi HRIS belum dikonfigurasi.' };
    }
    try {
      const integrationUrl = this.baseUrl.replace(/\/assistant$/, '') + '/integration/v1/assistant';
      const res = await axios.get(`${integrationUrl}/attendance/daily`, {
        params: date ? { date } : {},
        headers: this.getHeaders(),
        timeout: 4000,
      });
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  }

  async getPendingRequests() {
    if (!this.isConfigured()) {
      return { success: false, message: 'Integrasi HRIS belum dikonfigurasi.' };
    }
    try {
      const integrationUrl = this.baseUrl.replace(/\/assistant$/, '') + '/integration/v1/assistant';
      const res = await axios.get(`${integrationUrl}/requests`, {
        headers: this.getHeaders(),
        timeout: 4000,
      });
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  }

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

  async getEmployeesSummary() {
    if (!this.isConfigured()) {
      return { success: false, message: 'Integrasi HRIS belum dikonfigurasi.' };
    }
    try {
      const integrationUrl = this.baseUrl.replace(/\/assistant$/, '') + '/integration/v1/assistant';
      const res = await axios.get(`${integrationUrl}/employees`, {
        headers: this.getHeaders(),
        timeout: 4000,
      });
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  }
}
