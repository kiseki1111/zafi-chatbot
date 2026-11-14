import { Injectable, Logger, Optional, BeforeApplicationShutdown } from '@nestjs/common';
import { IncomingMessage } from './interfaces/incoming-message.interface';
import { CsService } from '../../features/agent-cs/cs.service';
import { PrismaService } from '../prisma/prisma.service';
import { AlertService } from '../../modules/monitoring/alert.service';
import { resolveTenantCapacity } from '../../features/web-dashboard/tenant/tenant.service';

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

  // ponytail: tracking retry timestamp untuk 30 menit max timeout strategy
  private taskStartTimes = new Map<string, number>();
  private readonly MAX_RETRY_DURATION_MS = 30 * 60 * 1000; // 30 menit

  constructor(
    private readonly csService: CsService,
    private readonly prisma: PrismaService,
    @Optional() private readonly alertService?: AlertService,
  ) {}

  // ponytail: flush all pending debounce buffers on graceful shutdown to prevent message drop in RAM
  async beforeApplicationShutdown(signal?: string) {
    this.logger.log(
      `[Omnichannel] Menerima sinyal shutdown (${signal}), melakukan flush ${this.messageBuffer.size} buffer pesan...`,
    );
    for (const [customerKey, item] of Array.from(
      this.messageBuffer.entries(),
    )) {
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
        const taskKey = `${botKey}:${task.senderId}`;
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
            select: {
              mode: true,
              id: true,
              whatsappInstance: { select: { tenantId: true } },
            },
          });

          if (conversation?.mode === 'human') {
            this.logger.log(
              `[Omnichannel] Chat ${task.senderId} (ID: ${conversation.id}) dalam mode human, AI 100% BYPASS/SKIP.`,
            );
            this.taskStartTimes.delete(taskKey);
            continue; // Skip reply AI
          }

          // ponytail: jika kuota tenant habis, otomatis alihkan percakapan ke mode human (admin takeover)
          const tenantId = conversation?.whatsappInstance?.tenantId;
          if (tenantId && (await this.isTenantQuotaExceeded(tenantId))) {
            if (conversation?.id) {
              await Promise.resolve(
                this.prisma.conversation?.update?.({
                  where: { id: conversation.id },
                  data: { mode: 'human' },
                }),
              ).catch(() => null);
            }
            this.logger.log(
              `[Omnichannel] Kuota tenant ${tenantId} telah habis. Chat ${task.senderId} dialihkan otomatis ke mode human (admin takeover).`,
            );
            this.taskStartTimes.delete(taskKey);
            continue; // Skip reply AI, admin manusia mengambil alih di web dashboard
          }

          const processPromise = (async () => {
            const response = await this.csService.handleMessage(task);
            if (response && response.text) {
              isResponseHandled = true;
            }
            await task.replyCallback(response);
            isResponseHandled = true;
            this.taskStartTimes.delete(taskKey); // Cleanup tracking setelah sukses
          })();

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error('Batas waktu pemrosesan pesan habis (Timeout 120s)'),
                ),
              120000, // 2 menit per attempt — cukup waktu untuk server yang sibuk
            ),
          );

          await Promise.race([processPromise, timeoutPromise]);
        } catch (error: any) {
          this.logger.error(
            `[Omnichannel] Error memproses chat ${task.senderId} pada bot ${botKey}: ${error.message}`,
          );

          const retryCount = (task as any)._retryCount || 0;
          const maxRetries = 100;

          // ponytail: track start time untuk enforce 30 menit max retry duration
          if (!this.taskStartTimes.has(taskKey)) {
            this.taskStartTimes.set(taskKey, Date.now());
          }

          const startTime = this.taskStartTimes.get(taskKey)!;
          const elapsedMs = Date.now() - startTime;
          const remainingDurationMs =
            this.MAX_RETRY_DURATION_MS - elapsedMs;

          // ponytail: jangan pernah kirim pesan "sistem sedang sibuk" ke customer.
          // Terus retry selama ada waktu & retry count belum habis.
          if (!isResponseHandled && retryCount < maxRetries && remainingDurationMs > 0) {
            (task as any)._retryCount = retryCount + 1;

            // Exponential backoff: 1s, 2s, 4s, 8s, ... max 60s
            const baseDelay = Math.min(1000 * Math.pow(2, retryCount), 60000);
            // Random jitter ±10% untuk mencegah thundering herd
            const jitter = baseDelay * 0.1 * (Math.random() - 0.5);
            const delayMs = Math.max(1000, Math.min(baseDelay + jitter, 60000));

            this.logger.warn(
              `[Omnichannel Aggressive-Retry] Pesan ${task.senderId} di-retry (Attempt ${retryCount + 1}/${maxRetries}) dalam ${delayMs}ms. Durasi elapsed: ${Math.round(elapsedMs / 1000)}s/${Math.round(this.MAX_RETRY_DURATION_MS / 1000)}s...`,
            );

            setTimeout(() => {
              if (!this.botQueues.has(botKey)) {
                this.botQueues.set(botKey, []);
              }
              this.botQueues.get(botKey)!.unshift(task);
              this.processBotQueue(botKey);
            }, delayMs);
          } else if (!isResponseHandled) {
            // ponytail: JANGAN kirim "sistem sedang sibuk" — customer sudah menunggu 30 menit.
            // Log saja untuk debugging. Admin/monitoring akan lihat di log bahwa pesan gagal diproses.
            const elapsedSeconds = Math.round(elapsedMs / 1000);
            this.logger.error(
              `[Omnichannel HARD-FAIL] Pesan dari ${task.senderId} gagal diproses setelah ${retryCount + 1} retry dalam ${elapsedSeconds}s. TIDAK MENGIRIM PESAN ERROR KE CUSTOMER (sesuai instruksi untuk never show error message).`,
            );

            // 🚨 SEND TELEGRAM ALERT untuk admin/monitoring
            if (this.alertService) {
              try {
                await this.alertService.alertHardFailMessage(
                  task.senderId,
                  task.sessionName || 'unknown',
                  retryCount + 1,
                  elapsedSeconds,
                );
              } catch (alertError) {
                this.logger.warn(
                  `Failed to send hard-fail alert: ${alertError.message}`,
                );
              }
            }

            // Bersihkan tracking
            this.taskStartTimes.delete(taskKey);

            // ponytail: OPSI: Jika perlu silent fallback, bisa uncomment ini:
            // Tapi untuk sekarang, kami tidak kirim apapun agar customer tidak kecewa
            // try {
            //   await task.replyCallback({
            //     text: 'Maaf, nomor ini sedang tidak responsif. Silakan coba hubungi tim support kami.',
            //     images: [],
            //   });
            // } catch (e) {}
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

  // ponytail: cek apakah kuota akun tenant sudah mencapai batas limit (MAU > 110% atau AI habis)
  private async isTenantQuotaExceeded(tenantId: string): Promise<boolean> {
    try {
      const tenant = await Promise.resolve(
        this.prisma.tenant?.findUnique?.({
          where: { id: tenantId },
          select: {
            metadata: true,
            whatsappInstances: { select: { instanceName: true } },
          },
        }),
      ).catch(() => null);
      if (!tenant) return false;

      const capacity = resolveTenantCapacity(tenant.metadata);
      if (capacity.isDeveloper) return false;
      if (capacity.isTrialExpired) return true; // ponytail: trial 14 hari kadaluarsa otomatis hentikan bot
      if (capacity.planKey === null) return true; // Akun tanpa paket dianggap limit

      const instanceNames =
        tenant.whatsappInstances?.map((i: any) => i.instanceName) || [];
      if (instanceNames.length === 0) return false;

      // 1. Validasi kuota respons AI bulanan
      if (capacity.maxAiResponses > 0 && this.prisma.message?.count) {
        const aiUsed =
          (await Promise.resolve(
            this.prisma.message.count({
              where: {
                senderType: 'bot',
                conversation: { instanceName: { in: instanceNames } },
              },
            }),
          ).catch(() => 0)) ?? 0;
        if (aiUsed >= capacity.maxAiResponses) {
          return true;
        }
      }

      // 2. Validasi soft-limit 110% MAU
      if (capacity.maxMau > 0 && this.prisma.conversation?.findMany) {
        const softLimitMau = Math.round(capacity.maxMau * 1.1);
        const conversations = await Promise.resolve(
          this.prisma.conversation.findMany({
            where: {
              instanceName: { in: instanceNames },
              contact: { phone: { not: { contains: 'broadcast' } } },
            },
            select: { contactId: true },
            distinct: ['contactId'],
          }),
        ).catch(() => []);
        if (conversations.length > softLimitMau) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }
}
