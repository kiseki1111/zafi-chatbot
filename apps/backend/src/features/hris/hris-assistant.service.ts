import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type OpenAI from 'openai';
import { OPENAI_CLIENT, OPENAI_MODEL } from '../../core/openai/openai.module';
import { HrisService } from './hris.service';

export interface HrisAssistantReply {
  handled: boolean;
  reply?: string;
  toolsUsed?: string[];
}

interface EmployeeIdentity {
  nik: string;
  name: string;
  department: string;
  position: string;
  isHrOrManager: boolean;
}

interface MemoryEntry {
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  expiresAt: number;
}

const MEMORY_TTL_MS = 30 * 60 * 1000;
const MEMORY_MAX_MESSAGES = 6;
const MAX_TOOL_ROUNDS = 4;

const HR_MANAGER_PATTERN = /\b(hr|hrd|human\s*resource|manager|manajer|direktur|admin|administrator|owner|executive)\b/i;

/**
 * Asisten HRD per-tenant (Arsitektur Opsi B: AI di Chatbot, HRIS hanya menyediakan endpoint).
 * Setiap tenant memakai session WAHA sendiri (`asisten-<tenantShort>`), identitas karyawan
 * diverifikasi dari nomor WhatsApp via HrisService.lookupKaryawan(tenantId, phone), dan seluruh
 * query data HRIS otomatis terisolasi ke instance HRIS milik tenant tersebut lewat SSO Console.
 */
@Injectable()
export class HrisAssistantService {
  private readonly logger = new Logger(HrisAssistantService.name);
  private readonly memory = new Map<string, MemoryEntry>();

  constructor(
    private readonly hrisService: HrisService,
    @Optional() @Inject(OPENAI_CLIENT) private readonly openai: OpenAI | null = null,
    @Optional() @Inject(OPENAI_MODEL) private readonly model: string = 'gpt-4o-mini',
  ) {}

  /** Normalisasi chatId WhatsApp menjadi nomor telepon bersih. */
  normalizePhone(chatIdOrPhone: string): string {
    return (chatIdOrPhone || '').replace(/@(c\.us|s\.whatsapp\.net|lid)$/i, '').trim();
  }

  async handleMessage(
    tenantId: string | null,
    chatIdOrPhone: string,
    rawText: string,
  ): Promise<HrisAssistantReply> {
    const text = (rawText || '').trim();
    if (!tenantId || !text) {
      return { handled: false };
    }

    const phone = this.normalizePhone(chatIdOrPhone);
    if (!phone) {
      return { handled: false };
    }

    // 1. Verifikasi nomor pengirim ke HRIS milik tenant ini (resolusi SSO per-tenant)
    const lookup = await this.hrisService.lookupKaryawan(tenantId, phone);
    if (!lookup?.success || !lookup?.data) {
      const msg = String(lookup?.message || '');
      if (msg.toLowerCase().includes('belum dikonfigurasi')) {
        return {
          handled: true,
          reply: 'Integrasi HRIS untuk perusahaan Anda belum aktif atau belum terhubung di ZAF Console.',
        };
      }
      this.logger.log(`[HrisAssistant] Nomor ${phone} tidak terdaftar di HRIS tenant ${tenantId}, diabaikan.`);
      return { handled: false };
    }

    const employee = this.extractIdentity(lookup.data);
    if (!employee.nik) {
      return { handled: false };
    }

    const memKey = `${tenantId}:${phone}`;
    if (/^\/?(reset|mulai ulang)$/i.test(text)) {
      this.memory.delete(memKey);
      return {
        handled: true,
        reply: `Percakapan direset. Ada yang bisa saya bantu, ${employee.name}?`,
      };
    }

    if (!this.openai) {
      return {
        handled: true,
        reply: 'Maaf, layanan AI Asisten HRD sedang belum dikonfigurasi.',
      };
    }

    const history = this.getHistory(memKey);
    const tools = this.buildTools(employee.isHrOrManager);
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.buildSystemPrompt(employee) },
      ...history,
      { role: 'user', content: text },
    ];

    const toolsUsed: string[] = [];
    let finalReply = '';

    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const completion = await this.openai.chat.completions.create({
          model: this.model || 'gpt-4o-mini',
          messages,
          tools,
          tool_choice: 'auto',
          temperature: 0.2,
        });

        const choice = completion.choices?.[0]?.message;
        if (!choice) break;

        if (!choice.tool_calls || choice.tool_calls.length === 0) {
          finalReply = (choice.content || '').trim();
          break;
        }

        messages.push(choice);

        for (const call of choice.tool_calls) {
          if (call.type !== 'function') continue;
          const fnName = call.function.name;
          toolsUsed.push(fnName);
          let args: Record<string, any> = {};
          try {
            args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
          } catch {
            args = {};
          }
          const result = await this.executeTool(tenantId, employee, fnName, args);
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        }
      }
    } catch (err: any) {
      this.logger.error(`[HrisAssistant] Error AI/tool loop tenant=${tenantId}: ${err?.message || err}`);
      return {
        handled: true,
        reply: 'Maaf, terjadi gangguan saat memproses permintaan Anda. Silakan coba lagi sebentar.',
      };
    }

    if (!finalReply) {
      finalReply = 'Maaf, saya belum bisa menemukan jawaban dari data HRIS saat ini.';
    }

    this.saveHistory(memKey, [
      ...history,
      { role: 'user', content: text },
      { role: 'assistant', content: finalReply },
    ]);

    return { handled: true, reply: finalReply, toolsUsed };
  }

  private extractIdentity(data: any): EmployeeIdentity {
    const nik = String(data.nik || data.employee_id || data.id || '').trim();
    const name = String(data.name || data.nama_karyawan || data.nama || 'Rekan Kerja').trim();
    const department = String(data.department || data.departemen || '').trim();
    const position = String(data.position || data.jabatan || data.role || '').trim();
    const isHrOrManager = Boolean(
      data.is_hr ||
        data.is_admin ||
        HR_MANAGER_PATTERN.test(position) ||
        HR_MANAGER_PATTERN.test(department),
    );
    return { nik, name, department, position, isHrOrManager };
  }

  private buildSystemPrompt(employee: EmployeeIdentity): string {
    return [
      `Anda adalah Asisten HRD internal perusahaan via WhatsApp.`,
      `Identitas penanya saat ini (sudah terverifikasi dari nomor WhatsApp):`,
      `- Nama: ${employee.name}`,
      `- NIK: ${employee.nik}`,
      `- Jabatan: ${employee.position || '-'}`,
      `- Departemen: ${employee.department || '-'}`,
      `- Akses HR/Manajemen: ${employee.isHrOrManager ? 'YA' : 'TIDAK (hanya data pribadi)'}`,
      ``,
      `Aturan wajib:`,
      `1. Gunakan tool yang tersedia untuk mengambil data nyata dari HRIS. Jangan pernah mengarang angka atau status.`,
      `2. Jika user tidak punya akses HR/Manajemen dan menanyakan data karyawan lain/rekap perusahaan, tolak dengan sopan.`,
      `3. Balas dalam bahasa Indonesia yang ramah, ringkas, dan rapi untuk WhatsApp (hindari markdown ** atau #, gunakan strip '-' untuk poin).`,
    ].join('\n');
  }

  private buildTools(isHrOrManager: boolean): OpenAI.Chat.Completions.ChatCompletionTool[] {
    const personalTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'cek_sisa_cuti',
          description: 'Mengecek sisa kuota dan riwayat cuti karyawan penanya.',
          parameters: { type: 'object', properties: {}, additionalProperties: false },
        },
      },
      {
        type: 'function',
        function: {
          name: 'cek_presensi_saya',
          description: 'Mengecek ringkasan presensi/kehadiran pribadi karyawan penanya.',
          parameters: { type: 'object', properties: {}, additionalProperties: false },
        },
      },
      {
        type: 'function',
        function: {
          name: 'cek_slip_gaji_saya',
          description: 'Mengecek rincian slip gaji terbaru karyawan penanya.',
          parameters: { type: 'object', properties: {}, additionalProperties: false },
        },
      },
    ];

    if (!isHrOrManager) {
      return personalTools;
    }

    const hrTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'presensi_harian',
          description: 'Rekap presensi seluruh karyawan pada tanggal tertentu (YYYY-MM-DD). Kosongkan untuk hari ini.',
          parameters: {
            type: 'object',
            properties: {
              tanggal: { type: 'string', description: 'Tanggal YYYY-MM-DD' },
            },
            additionalProperties: false,
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'pengajuan_menunggu',
          description: 'Daftar pengajuan izin, sakit, cuti, dinas, atau lembur yang menunggu persetujuan.',
          parameters: { type: 'object', properties: {}, additionalProperties: false },
        },
      },
      {
        type: 'function',
        function: {
          name: 'ringkasan_karyawan',
          description: 'Ringkasan jumlah karyawan aktif per departemen/cabang/status.',
          parameters: { type: 'object', properties: {}, additionalProperties: false },
        },
      },
    ];

    return [...personalTools, ...hrTools];
  }

  private async executeTool(
    tenantId: string,
    employee: EmployeeIdentity,
    name: string,
    args: Record<string, any>,
  ): Promise<any> {
    switch (name) {
      case 'cek_sisa_cuti':
        return this.hrisService.getCutiBalance(tenantId, employee.nik);
      case 'cek_presensi_saya':
        return this.hrisService.getPresensiSummary(tenantId, employee.nik);
      case 'cek_slip_gaji_saya':
        return this.hrisService.getSlipGaji(tenantId, employee.nik);
      case 'presensi_harian':
        if (!employee.isHrOrManager) {
          return { success: false, message: 'Akses ditolak: hanya untuk HR/Manager.' };
        }
        return this.hrisService.getDailyAttendance(
          tenantId,
          typeof args.tanggal === 'string' ? args.tanggal : undefined,
        );
      case 'pengajuan_menunggu':
        if (!employee.isHrOrManager) {
          return { success: false, message: 'Akses ditolak: hanya untuk HR/Manager.' };
        }
        return this.hrisService.getPendingRequests(tenantId);
      case 'ringkasan_karyawan':
        if (!employee.isHrOrManager) {
          return { success: false, message: 'Akses ditolak: hanya untuk HR/Manager.' };
        }
        return this.hrisService.getEmployeesSummary(tenantId);
      default:
        return { success: false, message: `Tool ${name} tidak dikenal.` };
    }
  }

  private getHistory(key: string): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const entry = this.memory.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      this.memory.delete(key);
      return [];
    }
    return entry.messages;
  }

  private saveHistory(
    key: string,
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  ): void {
    this.memory.set(key, {
      messages: messages.slice(-MEMORY_MAX_MESSAGES),
      expiresAt: Date.now() + MEMORY_TTL_MS,
    });
  }
}
