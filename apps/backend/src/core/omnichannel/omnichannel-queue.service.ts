import { Injectable, Logger } from '@nestjs/common';
import { IncomingMessage } from './interfaces/incoming-message.interface';
import { CsService } from '../../features/agent-cs/cs.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OmnichannelQueueService {
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

          const response = await this.csService.handleMessage(task);
          await task.replyCallback(response);
        } catch (error) {
          this.logger.error(
            `[Omnichannel] Error memproses chat ${task.senderId} pada bot ${botKey}: ${error.message}`,
          );
          try {
            await task.replyCallback({
              text: 'Maaf, sistem sedang sibuk. Mohon coba beberapa saat lagi.',
              images: [],
            });
          } catch (e) {}
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
