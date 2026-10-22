import {
  Injectable,
  Logger,
  BeforeApplicationShutdown,
} from '@nestjs/common';
import { IncomingMessage } from './interfaces/incoming-message.interface';
import { CsService } from '../../features/agent-cs/cs.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OmnichannelQueueService implements BeforeApplicationShutdown {
  private readonly logger = new Logger(OmnichannelQueueService.name);

  // Buffer debounce per nomor pelanggan per chatbot (10 detik untuk menggabungkan chat beruntun & hindari deteksi bot)
  private messageBuffer = new Map<
    string,
    {
      texts: string[];
      timer: NodeJS.Timeout;
      message: IncomingMessage;
    }
  >();

  // Antrean FIFO per chatbot instance:
  // 1 chatbot membalas chat pelanggan 1 per 1 (serial/FIFO).
  // Chatbot yang berbeda berjalan paralel tanpa saling memblokir.
  private botQueues = new Map<string, IncomingMessage[]>();
  private activeProcessingBots = new Set<string>();

  constructor(
    private readonly csService: CsService,
    private readonly prisma: PrismaService,
  ) {}

  // ponytail: flush all pending debounce buffers on graceful shutdown to prevent message drop in RAM
  async beforeApplicationShutdown(signal?: string) {
    this.logger.log(
      `[Omnichannel] Menerima sinyal shutdown (${signal}), melakukan flush ${this.messageBuffer.size} buffer pesan...`,
    );
    for (const [customerKey, item] of Array.from(this.messageBuffer.entries())) {
      clearTimeout(item.timer);
      const botKey =
        item.message.sessionName || item.message.provider || 'default_bot';
      this.flushCustomerBuffer(customerKey, botKey);
    }
  }

  enqueue(message: IncomingMessage) {
    const { senderId, text, sessionName, provider } = message;
    const botKey = sessionName || provider || 'default_bot';
    const customerKey = `${botKey}_${senderId}`;

    const existing = this.messageBuffer.get(customerKey);
    if (existing) {
      clearTimeout(existing.timer);
      existing.texts.push(text);
      existing.message.text = existing.texts.join('\n'); // Gabungkan chat beruntun

      existing.timer = setTimeout(() => {
        this.flushCustomerBuffer(customerKey, botKey);
      }, 10000); // 10 detik debounce
    } else {
      this.messageBuffer.set(customerKey, {
        texts: [text],
        message: { ...message },
        timer: setTimeout(() => {
          this.flushCustomerBuffer(customerKey, botKey);
        }, 10000),
      });
    }
  }

  private flushCustomerBuffer(customerKey: string, botKey: string) {
    const buffered = this.messageBuffer.get(customerKey);
    if (!buffered) return;

    this.messageBuffer.delete(customerKey);

    // Masukkan ke antrean FIFO milik chatbot ini
    if (!this.botQueues.has(botKey)) {
      this.botQueues.set(botKey, []);
    }
    this.botQueues.get(botKey)!.push(buffered.message);

    // Jalankan pemrosesan untuk chatbot ini
    this.processBotQueue(botKey);
  }

  private async processBotQueue(botKey: string) {
    // Jika chatbot ini sedang sibuk membalas pesan, pesan berikutnya menunggu giliran secara FIFO
    if (this.activeProcessingBots.has(botKey)) return;
    this.activeProcessingBots.add(botKey);

    try {
      const queue = this.botQueues.get(botKey);

      while (queue && queue.length > 0) {
        const task = queue.shift();
        if (!task) continue;

        let isResponseHandled = false;
        try {
          this.logger.log(
            `[Omnichannel] Chatbot "${botKey}" memproses pesan dari ${task.senderId} (Sisa antrean bot ini: ${queue.length})`,
          );

          // Cek apakah percakapan sedang dalam mode human (admin takeover)
          const cleanSenderPhone = task.senderId.replace(
            /@c\.us|@s\.whatsapp\.net/g,
            '',
          );
          const conversation = await this.prisma.conversation.findFirst({
            where: {
              instanceName: task.sessionName || task.provider,
              contact: {
                OR: [
                  { phone: task.senderId },
                  { phone: cleanSenderPhone },
                  { phone: { contains: cleanSenderPhone } },
                ],
              },
            },
            select: { mode: true, id: true },
          });

          if (conversation?.mode === 'human') {
            this.logger.log(
              `[Omnichannel] Chat ${task.senderId} (ID: ${conversation.id}) dalam mode human, AI 100% BYPASS/SKIP.`,
            );
            continue; // Skip reply AI
          }

          const processPromise = (async () => {
            const response = await this.csService.handleMessage(task);
            if (response && response.text) {
              isResponseHandled = true;
            }
            await task.replyCallback(response);
            isResponseHandled = true;
          })();

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error('Batas waktu pemrosesan pesan habis (Timeout 60s)'),
                ),
              60000,
            ),
          );

          await Promise.race([processPromise, timeoutPromise]);
        } catch (error: any) {
          this.logger.error(
            `[Omnichannel] Error memproses chat ${task.senderId} pada bot ${botKey}: ${error.message}`,
          );
          // Jangan pernah kirim "Maaf, sistem sibuk" jika AI sudah berhasil merespons atau sedang mengirim
          if (!isResponseHandled) {
            try {
              await task.replyCallback({
                text: 'Maaf, sistem sedang sibuk. Mohon coba beberapa saat lagi.',
                images: [],
              });
            } catch (e) {}
          }
        }
      }
    } finally {
      this.activeProcessingBots.delete(botKey);
      if (this.botQueues.get(botKey)?.length === 0) {
        this.botQueues.delete(botKey);
      }
    }
  }
}
