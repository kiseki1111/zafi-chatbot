import { Injectable, Logger } from '@nestjs/common';
import { IncomingMessage } from './interfaces/incoming-message.interface';
import { CsService } from '../../features/agent-cs/cs.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OmnichannelQueueService {
  private readonly logger = new Logger(OmnichannelQueueService.name);

  // Buffer debounce per nomor (10 detik untuk menghindari deteksi bot WA)
  private messageBuffer = new Map<
    string,
    {
      texts: string[];
      timer: NodeJS.Timeout;
      message: IncomingMessage;
    }
  >();

  // Antrean FIFO terisolasi per nomor telepon (nomor berbeda diproses paralel tanpa saling tunggu)
  private userQueues = new Map<string, IncomingMessage[]>();
  private activeProcessingUsers = new Set<string>();

  constructor(
    private readonly csService: CsService,
    private readonly prisma: PrismaService,
  ) {}

  enqueue(message: IncomingMessage) {
    const { senderId, text, provider } = message;
    const bufferKey = `${provider}_${senderId}`;

    const existing = this.messageBuffer.get(bufferKey);
    if (existing) {
      clearTimeout(existing.timer);
      existing.texts.push(text);
      existing.message.text = existing.texts.join('\n'); // Gabungkan pesan beruntun

      existing.timer = setTimeout(() => {
        this.flushBuffer(bufferKey);
      }, 10000); // 10 detik debounce anti-bot detection
    } else {
      this.messageBuffer.set(bufferKey, {
        texts: [text],
        message: { ...message },
        timer: setTimeout(() => {
          this.flushBuffer(bufferKey);
        }, 10000),
      });
    }
  }

  private flushBuffer(bufferKey: string) {
    const buffered = this.messageBuffer.get(bufferKey);
    if (!buffered) return;

    this.messageBuffer.delete(bufferKey);

    // Masukkan ke antrean khusus nomor ini
    if (!this.userQueues.has(bufferKey)) {
      this.userQueues.set(bufferKey, []);
    }
    this.userQueues.get(bufferKey)!.push(buffered.message);

    // Jalankan pemrosesan untuk nomor ini secara independen
    this.processUserQueue(bufferKey);
  }

  private async processUserQueue(bufferKey: string) {
    // Jika nomor ini sedang dalam proses inferensi AI, biarkan loop yang berjalan menyelesaikannya secara FIFO
    if (this.activeProcessingUsers.has(bufferKey)) return;
    this.activeProcessingUsers.add(bufferKey);

    try {
      const queue = this.userQueues.get(bufferKey);

      while (queue && queue.length > 0) {
        const task = queue.shift();
        if (!task) continue;

        try {
          this.logger.log(
            `[Omnichannel] Memproses pesan dari ${task.senderId} via ${task.provider} (Queue independen per nomor)`,
          );

          // Cek apakah conversation sedang dalam mode human (admin takeover)
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
              `[Omnichannel] Conversation ${task.senderId} (ID: ${conversation.id}) dalam mode human, AI 100% BYPASS/SKIP.`,
            );
            continue; // Pesan sudah tersimpan di webhook, skip reply AI
          }

          const response = await this.csService.handleMessage(task);
          await task.replyCallback(response);
        } catch (error) {
          this.logger.error(
            `[Omnichannel] Error memproses pesan dari ${task.senderId}: ${error.message}`,
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
      this.userQueues.delete(bufferKey);
      this.activeProcessingUsers.delete(bufferKey);
    }
  }
}
