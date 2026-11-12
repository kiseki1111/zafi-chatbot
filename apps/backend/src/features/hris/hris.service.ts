import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class HrisService {
  private readonly logger = new Logger(HrisService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    const rawUrl =
      this.configService.get<string>('HRIS_API_URL') ||
      process.env.HRIS_API_URL ||
      'http://127.0.0.1:8000/api/assistant';
    this.baseUrl = rawUrl.replace(/\/$/, '');
    this.apiKey =
      this.configService.get<string>('HRIS_API_KEY') ||
      process.env.HRIS_API_KEY ||
      'hris_bot_sec_live_948f2a';

    this.logger.log(`[HrisService] Initialized with baseUrl: ${this.baseUrl}`);
  }

  private getHeaders() {
    return {
      Accept: 'application/json',
      'X-Assistant-Key': this.apiKey,
    };
  }

  async getHealth() {
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

  async lookupKaryawan(phone?: string, nik?: string) {
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

  async getEmployeesSummary() {
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
