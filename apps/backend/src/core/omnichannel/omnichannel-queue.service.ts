import { Injectable, Logger, BeforeApplicationShutdown } from '@nestjs/common';
import { IncomingMessage } from './interfaces/incoming-message.interface';
import { CsService } from '../../features/agent-cs/cs.service';
import { PrismaService } from '../prisma/prisma.service';
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

  constructor(
    private readonly csService: CsService,
    private readonly prisma: PrismaService,
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
            continue; // Skip reply AI, admin manusia mengambil alih di web dashboard
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
          const autoApplied = await this.tryAutoTopUp(tenant);
          if (!autoApplied) return true;
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
          const autoApplied = await this.tryAutoTopUp(tenant);
          if (!autoApplied) return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  // ponytail: aktivasi otomatis paket booster s saat kuota 100% jika diaktifkan tenant
  private async tryAutoTopUp(tenant: any): Promise<boolean> {
    try {
      const meta = tenant.metadata || {};
      if (!meta.autoTopUpEnabled) return false;

      const monthlyLimit = Number(meta.autoTopUpMonthlyLimit) || 3;
      const currentMonth = new Date().toISOString().slice(0, 7);
      const autoCount =
        meta.autoTopUpMonth === currentMonth
          ? Number(meta.autoTopUpCount) || 0
          : 0;

      if (autoCount >= monthlyLimit) return false;

      // Booster S: +500 MAU, +2000 AI
      const updatedMeta = {
        ...meta,
        extraMau: (Number(meta.extraMau) || 0) + 500,
        extraAiResponses: (Number(meta.extraAiResponses) || 0) + 2000,
        autoTopUpCount: autoCount + 1,
        autoTopUpMonth: currentMonth,
        topups: [
          {
            id: `auto-booster-${Date.now()}`,
            itemKey: 'BOOSTER_S',
            name: 'Auto Top-Up Booster S',
            price: 160000,
            mau: 500,
            ai: 2000,
            notes: `Auto top-up #${autoCount + 1} kuota 100%`,
            createdAt: new Date().toISOString(),
          },
          ...(Array.isArray(meta.topups) ? meta.topups : []),
        ],
      };

      await Promise.resolve(
        this.prisma.tenant?.update?.({
          where: { id: tenant.id },
          data: { metadata: updatedMeta },
        }),
      ).catch(() => null);

      this.logger.log(
        `[Omnichannel] Auto Top-Up Booster S berhasil diterapkan untuk tenant ${tenant.id} (${autoCount + 1}/${monthlyLimit})`,
      );
      return true;
    } catch {
      return false;
    }
  }
}
