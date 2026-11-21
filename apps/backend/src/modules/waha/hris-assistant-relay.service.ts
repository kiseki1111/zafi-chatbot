import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { WahaService } from './waha.service';

interface ConsoleAssistantReply {
  handled: boolean;
  reply?: string;
}

/**
 * Jembatan WAHA -> Asisten HRD Console. Dipakai HANYA untuk satu nomor/session WAHA yang
 * didedikasikan (env HRIS_ASSISTANT_WAHA_SESSION) -- session lain (nomor CS jualan) tetap
 * diproses CsService seperti biasa, tidak pernah lewat jalur ini. Console yang urus identifikasi
 * nomor + tool-calling ke HRIS; di sini cuma relay teks masuk & balasan, tanpa menyimpan apapun
 * ke DB chatbot (percakapan ini bukan data chatbot, melainkan data Console/HRIS pelanggan).
 */
@Injectable()
export class HrisAssistantRelayService {
  private readonly logger = new Logger(HrisAssistantRelayService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly wahaService: WahaService,
  ) {}

  /** Session WAHA yang didedikasikan untuk Asisten HRD; null = fitur ini mati (env kosong). */
  dedicatedSession(): string | null {
    const session = this.configService.get<string>('HRIS_ASSISTANT_WAHA_SESSION')?.trim();
    return session && session.length > 0 ? session : null;
  }

  async relay(sessionName: string, chatId: string, text: string): Promise<void> {
    const channelKey = this.configService.get<string>('CONSOLE_ASSISTANT_CHANNEL_KEY');
    if (!channelKey) {
      this.logger.warn(
        '[HrisAssistantRelay] CONSOLE_ASSISTANT_CHANNEL_KEY belum diset -- pesan diabaikan.',
      );
      return;
    }
    const consoleApiUrl =
      this.configService.get<string>('CONSOLE_API_URL') || 'http://localhost:17342';
    const phone = chatId.replace(/@c\.us$/, '');

    try {
      const res = await axios.post<ConsoleAssistantReply>(
        `${consoleApiUrl}/api/integration/v1/assistant/messages`,
        { phone, text },
        { timeout: 30000, headers: { Authorization: `Bearer ${channelKey}` } },
      );
      if (!res.data?.handled || !res.data.reply) {
        this.logger.log(
          `[HrisAssistantRelay] Nomor ini belum terdaftar di Asisten HRD, tidak dibalas.`,
        );
        return;
      }
      await this.wahaService.sendText(sessionName, chatId, res.data.reply);
    } catch (err: any) {
      this.logger.error(`[HrisAssistantRelay] Gagal relay ke Console: ${err.message}`);
    }
  }
}
