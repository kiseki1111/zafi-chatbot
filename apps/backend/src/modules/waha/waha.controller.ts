import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  Res,
  Logger,
  StreamableFile,
  ForbiddenException,
  BadRequestException,
  Headers,
  Optional,
  UseGuards,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import * as fs from 'fs';
import * as path from 'path';
import { WahaService } from './waha.service';
import { AvailabilityService } from '../availability/availability.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OmnichannelQueueService } from '../../core/omnichannel/omnichannel-queue.service';
import { IncomingMessage } from '../../core/omnichannel/interfaces/incoming-message.interface';
import { ChatStreamService } from '../chats/chat-stream.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { resolveTenantCapacity } from '../../features/web-dashboard/tenant/tenant.service';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/waha')
export class WahaController implements OnApplicationBootstrap {
  private readonly logger = new Logger(WahaController.name);

  // Queue for CLI Mock output
  private cliOutputQueue: any[] = [];

  constructor(
    private readonly wahaService: WahaService,
    private readonly prisma: PrismaService,
    private readonly omnichannelQueue: OmnichannelQueueService,
    @Optional() private readonly availabilityService?: AvailabilityService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test') return;
    // ponytail: recover customer messages from the last 5 minutes that had no bot reply (due to container restart)
    setTimeout(() => {
      this.recoverUnrepliedMessages().catch((e) =>
        this.logger.warn(
          `[Waha Startup Recovery] Gagal recover pesan tertinggal: ${e.message}`,
        ),
      );
      this.cleanDuplicateContacts().catch((e) =>
        this.logger.warn(
          `[Self-Healing] Gagal membersihkan kontak duplikat: ${e.message}`,
        ),
      );
    }, 3000);
  }

  // ponytail: self-healing cleanup for duplicate blank contacts (0 messages/notes) caused by outbound webhooks
  private async cleanDuplicateContacts() {
    try {
      const duplicates = await this.prisma.contact.groupBy({
        by: ['phone'],
        _count: { phone: true },
        having: { phone: { _count: { gt: 1 } } },
      });

      for (const dup of duplicates) {
        const contacts = await this.prisma.contact.findMany({
          where: { phone: dup.phone },
          include: {
            conversations: {
              include: {
                messages: { select: { id: true } },
              },
            },
          },
        });

        // Urutkan: kontak dengan pesan terbanyak / data CRM terkaya diprioritaskan
        const sorted = contacts.sort((a, b) => {
          const aMsgs = a.conversations.reduce(
            (sum, c) => sum + c.messages.length,
            0,
          );
          const bMsgs = b.conversations.reduce(
            (sum, c) => sum + c.messages.length,
            0,
          );
          const aScore =
            (aMsgs > 0 ? 10 : 0) +
            (a.notes ? 5 : 0) +
            (a.status !== 'NEW' ? 3 : 0);
          const bScore =
            (bMsgs > 0 ? 10 : 0) +
            (b.notes ? 5 : 0) +
            (b.status !== 'NEW' ? 3 : 0);
          return bScore - aScore;
        });

        const toRemove = sorted.slice(1);
        for (const extra of toRemove) {
          const extraMsgs = extra.conversations.reduce(
            (sum, c) => sum + c.messages.length,
            0,
          );
          if (extraMsgs === 0) {
            await this.prisma.contact
              .delete({ where: { id: extra.id } })
              .catch(() => null);
            this.logger.log(
              `[Self-Healing] Hapus kontak duplikat kosong: ${dup.phone} (ID: ${extra.id})`,
            );
          }
        }
      }
    } catch (e) {
      this.logger.debug(`cleanDuplicateContacts error: ${e.message}`);
    }
  }

  private async recoverUnrepliedMessages() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const unrepliedConversations = await this.prisma.conversation.findMany({
      where: {
        mode: 'bot',
        instanceName: { not: 'CLI_TEST_SESSION' },
        lastMessageAt: { gte: fiveMinutesAgo },
      },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    for (const conv of unrepliedConversations) {
      const lastMsg = conv.messages[0];
      if (lastMsg && lastMsg.senderType === 'customer' && conv.contact?.phone) {
        this.logger.log(
          `[Waha Startup Recovery] Memulihkan chat customer belum terbalas di sesi ${conv.instanceName} (${conv.contact.phone}): "${lastMsg.content}"`,
        );

        const targetSender = conv.contact.phone.includes('@')
          ? conv.contact.phone
          : `${conv.contact.phone}@c.us`;

        const incomingMessage: IncomingMessage = {
          senderId: targetSender,
          text: lastMsg.content,
          provider: 'WAHA',
          sessionName: conv.instanceName,
          replyCallback: async (reply) => {
            if (reply.text && reply.text.length > 0) {
              await this.wahaService.sendMessage(
                conv.instanceName,
                targetSender,
                reply.text,
              );
              const botMsg = await this.prisma.message.create({
                data: {
                  conversationId: conv.id,
                  senderType: 'bot',
                  messageType: 'text',
                  content: reply.text,
                  status: 'SENT',
                },
              });
              await this.prisma.conversation.update({
                where: { id: conv.id },
                data: { lastMessageAt: new Date() },
              });
              ChatStreamService.getInstance()?.emit({
                type: 'message',
                data: {
                  conversationId: conv.id,
                  instanceName: conv.instanceName,
                  message: botMsg,
                },
              });
            }
          },
        };

        this.omnichannelQueue.enqueue(incomingMessage);
      }
    }
  }

  @Post('instances')
  async createInstance(
    @Body('name') name: string,
    @Body('webhookUrl') webhookUrl?: string,
    @Body('channelAccountId') channelAccountId?: string,
    @Body('tenantId') tenantId?: string,
    @Req() req?: any,
  ) {
    try {
      if (!name || !name.trim()) {
        throw new BadRequestException('Nama sesi bot WhatsApp wajib diisi');
      }

      const cleanName = name.trim().replace(/\s+/g, '-').toLowerCase();

      const isSuper = req?.user?.roles?.includes('superadmin');
      const effectiveTenantId = isSuper
        ? tenantId && tenantId !== 'undefined' && tenantId !== 'null'
          ? tenantId
          : req?.user?.tenantId
        : req?.user?.tenantId;

      // Cek apakah nama instance sudah digunakan oleh tenant lain
      const existing = await this.prisma.whatsappInstance.findUnique({
        where: { instanceName: cleanName },
      });

      if (
        existing &&
        existing.tenantId &&
        existing.tenantId !== effectiveTenantId
      ) {
        throw new BadRequestException(
          `Nama sesi "${cleanName}" sudah digunakan oleh akun lain. Silakan pilih nama lain.`,
        );
      }

      // ponytail: validasi batas kuota nomor WhatsApp per tier
      if (effectiveTenantId) {
        const tenant = this.prisma.tenant?.findUnique
          ? await Promise.resolve(
              this.prisma.tenant.findUnique({
                where: { id: effectiveTenantId },
              }),
            ).catch(() => null)
          : null;
        if (tenant) {
          const capacity = resolveTenantCapacity(tenant.metadata);
          if (!capacity.isDeveloper && capacity.planKey !== null) {
            const instanceCount = this.prisma.whatsappInstance?.count
              ? ((await Promise.resolve(
                  this.prisma.whatsappInstance.count({
                    where: { tenantId: effectiveTenantId },
                  }),
                ).catch(() => 0)) ?? 0)
              : 0;
            if (instanceCount >= capacity.maxWhatsapp) {
              throw new BadRequestException(
                `Batas kuota nomor WhatsApp (${capacity.maxWhatsapp} nomor) untuk paket ${capacity.planName} telah tercapai. Silakan tingkatkan paket Anda.`,
              );
            }
          }
        }
      }

      const rawWebhooks: string[] = [];

      if (process.env.WEBHOOK_URL) {
        rawWebhooks.push(process.env.WEBHOOK_URL);
      }
      if (
        webhookUrl &&
        !webhookUrl.includes('localhost') &&
        !webhookUrl.includes('127.0.0.1')
      ) {
        rawWebhooks.push(webhookUrl);
      }

      // Webhook internal Docker network (primary & fast)
      rawWebhooks.push('http://backend:3030/api/v1/waha/webhook');

      // Deduplikasi webhook URL agar tidak mendaftarkan endpoint yang sama berulang kali
      const webhooks = Array.from(new Set(rawWebhooks.filter(Boolean)));

      this.logger.log(
        `[WAHA] Mendaftarkan webhook aktif: ${webhooks.join(', ')}`,
      );

      return await this.wahaService.startSession(
        cleanName,
        webhooks,
        channelAccountId,
        effectiveTenantId,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.response?.status === 422) {
        this.logger.warn(`Session ${name} already exists or is invalid.`);
        return {
          message:
            'Session already running or invalid state. Ignoring start command.',
          status: 'ignored',
        };
      }
      throw error;
    }
  }

  @Post('instances/:id/restart')
  async restartInstance(@Param('id') id: string) {
    return this.wahaService.restartSession(id);
  }

  @Post('instances/:id/stop')
  async stopInstance(@Param('id') id: string) {
    return this.wahaService.stopSession(id);
  }

  @Post('instances/:id/logout')
  async logoutInstance(@Param('id') id: string) {
    return this.wahaService.logoutSession(id);
  }

  @Delete('instances/:id')
  async deleteInstance(@Param('id') id: string, @Req() req: any) {
    const tenantId =
      req.query?.tenantId &&
      req.query.tenantId !== 'undefined' &&
      req.query.tenantId !== 'null'
        ? req.query.tenantId
        : req.user?.tenantId;

    if (tenantId && req.user?.role !== 'superadmin') {
      const instance = await this.prisma.whatsappInstance.findUnique({
        where: { instanceName: id },
      });
      if (instance && instance.tenantId && instance.tenantId !== tenantId) {
        throw new ForbiddenException('Akses ditolak: sesi ini milik akun lain');
      }
    }

    try {
      await this.wahaService.logoutSession(id);
    } catch (e) {
      this.logger.warn(
        `Failed to logout session ${id} from WAHA, ignoring: ${e.message}`,
      );
    }
    await this.prisma.whatsappInstance
      .delete({ where: { instanceName: id } })
      .catch(() => null);
    return { success: true };
  }

  @SkipThrottle()
  @Get('instances')
  async getInstances(@Req() req: any) {
    const isSuper = req.user?.roles?.includes('superadmin');
    const tenantId = isSuper
      ? req.query?.tenantId &&
        req.query.tenantId !== 'undefined' &&
        req.query.tenantId !== 'null'
        ? req.query.tenantId
        : req.user?.tenantId
      : req.user?.tenantId;
    return this.wahaService.getSessions(tenantId);
  }

  // Endpoint baru: ambil langsung dari database (bukan dari WAHA API)
  // Opsional: filter by tenantId jika diberikan
  @SkipThrottle()
  @Get('instances/db')
  async getInstancesFromDb(@Req() req: any) {
    const isSuper = req.user?.roles?.includes('superadmin');
    const tenantId = isSuper
      ? req.query?.tenantId &&
        req.query.tenantId !== 'undefined' &&
        req.query.tenantId !== 'null'
        ? req.query.tenantId
        : req.user?.tenantId
      : req.user?.tenantId;

    // Jika non-superadmin atau ada tenantId, filter hanya instance untuk tenant tersebut
    const where: any = tenantId ? { tenantId } : {};

    return this.prisma.whatsappInstance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  @SkipThrottle()
  @Get('instances/:id/status')
  async getInstanceStatus(@Param('id') id: string) {
    return this.wahaService.getSession(id);
  }

  @SkipThrottle()
  @Get('instances/:id/qr')
  async getQrCode(@Param('id') id: string, @Res() res: any) {
    try {
      const qrBuffer = await this.wahaService.getQrCode(id);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="qr-${id}.png"`);
      return res.send(Buffer.from(qrBuffer));
    } catch (error) {
      this.logger.warn(`QR code for ${id} not available: ${error.message}`);
      return res.status(error.response?.status || 404).send({
        error:
          error.message || 'QR Code belum tersedia atau server WAHA offline.',
      });
    }
  }

  @Public()
  @SkipThrottle()
  @Get('media/:session/:messageId')
  async getMedia(
    @Param('session') session: string,
    @Param('messageId') messageId: string,
    @Res() res: any,
  ) {
    try {
      const media = await this.wahaService.getMediaFile(session, messageId);
      if (!media || !media.data) {
        return res.status(404).send({ error: 'Media not found' });
      }
      res.setHeader('Content-Type', media.mimetype || 'image/jpeg');
      res.setHeader('Content-Disposition', 'inline');
      return res.send(media.data);
    } catch (error) {
      this.logger.warn(`Failed to proxy media ${messageId}: ${error.message}`);
      return res.status(error.response?.status || 500).send({
        error: error.message,
      });
    }
  }

  @Public()
  @SkipThrottle()
  @Get('files/*')
  async proxyWahaFile(@Req() req: any, @Res() res: any) {
    try {
      const idx = req.url.indexOf('/files/');
      const pathPart =
        idx !== -1 ? req.url.substring(idx + '/files/'.length) : '';
      const file = await this.wahaService.getMediaStreamOrBuffer(pathPart);
      if (!file || !file.data) {
        return res.status(404).send({ error: 'File not found' });
      }
      res.setHeader(
        'Content-Type',
        file.mimetype || 'application/octet-stream',
      );
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Disposition', 'inline');
      return res.send(file.data);
    } catch (e: any) {
      return res
        .status(e.response?.status || 404)
        .send({ error: 'File not found' });
    }
  }

  @Post('instances/:id/send')
  async sendMessage(
    @Param('id') id: string,
    @Body() body: { chatId: string; text: string },
  ) {
    const inst = await this.prisma.whatsappInstance.findUnique({
      where: { instanceName: id },
    });
    const tenantId = inst?.tenantId || null;

    let contact = await this.prisma.contact.findFirst({
      where: {
        phone: body.chatId,
        ...(tenantId ? { tenantId } : {}),
      },
    });
    if (!contact) {
      contact = await this.prisma.contact.create({
        data: { name: body.chatId, phone: body.chatId, tenantId },
      });
    }

    // 1. Create Conversation if not exists
    const conversation = await this.prisma.conversation.upsert({
      where: {
        instanceName_contactId: { instanceName: id, contactId: contact.id },
      },
      update: { lastMessageAt: new Date() },
      create: { instanceName: id, contactId: contact.id, unreadCount: 0 },
    });

    // 2. Create Message as PENDING
    const dbMsg = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'agent', // or user
        messageType: 'text',
        content: body.text,
        status: 'PENDING',
      },
    });

    // 3. Send to WAHA (it has random delay inside)
    this.wahaService
      .sendMessage(id, body.chatId, body.text)
      .then(async (result) => {
        // Note: Waha response might contain the msg id, but webhooks will also catch it.
        // We will let webhook handle the final ACK, or update it here if WAHA returns the ID.
        if (result && result.id) {
          await this.prisma.message
            .update({
              where: { id: dbMsg.id },
              data: { wahaMessageId: result.id, status: 'SENT' },
            })
            .catch(() => null);
        }
      })
      .catch(async (e) => {
        await this.prisma.message
          .update({
            where: { id: dbMsg.id },
            data: { status: 'ERROR' },
          })
          .catch(() => null);
      });

    return { success: true, messageId: dbMsg.id };
  }

  @SkipThrottle()
  @Get('instances/:id/logs')
  async getLogs(@Param('id') id: string) {
    return this.prisma.webhookLog.findMany({
      where: { instanceName: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Get('cli-poll')
  async cliPoll() {
    const messages = [...this.cliOutputQueue];
    this.cliOutputQueue = []; // flush
    return messages;
  }

  @SkipThrottle()
  @Public()
  @Post('webhook')
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-webhook-secret') headerSecret?: string,
    @Req() req?: any,
  ) {
    const configuredSecret =
      process.env.WAHA_WEBHOOK_SECRET ||
      this.configService?.get<string>('WAHA_WEBHOOK_SECRET');
    const querySecret = req?.query?.secret;

    if (
      configuredSecret &&
      (process.env.NODE_ENV !== 'test' || req !== undefined)
    ) {
      if (
        headerSecret !== configuredSecret &&
        querySecret !== configuredSecret
      ) {
        this.logger.warn(
          `[WAHA Webhook] Akses ditolak (Secret tidak cocok). IP: ${req?.ip || 'unknown'}`,
        );
        throw new ForbiddenException('Invalid or missing webhook secret');
      }
    }

    if (!payload) return { status: 'ignored' };

    const sessionName = payload.session || 'unknown';

    // Perlindungan Sesi Pengujian Pribadi (Silent/No-Bot/Test-Video):
    // Jangan tanggapi pesan apa pun, jangan simpan kontak/chat pribadi, jangan tolak panggilan pribadi.
    // Hanya perbarui status koneksi jika ada perubahan status sesi.
    const isTestSession =
      sessionName.toLowerCase().includes('test-video') ||
      sessionName.toLowerCase().includes('silent') ||
      sessionName.toLowerCase().includes('manual-only');

    if (isTestSession) {
      if (payload?.event === 'session.status') {
        const status = payload.payload?.status;
        if (sessionName && status) {
          const updateData: any = { status };
          if (status === 'WORKING') updateData.lastConnectedAt = new Date();
          await this.prisma.whatsappInstance
            .upsert({
              where: { instanceName: sessionName },
              update: updateData,
              create: { instanceName: sessionName, status },
            })
            .catch(() => null);
        }
      }
      return { status: 'ignored_test_session' };
    }

    // Defensively create WhatsappInstance if it doesn't exist to prevent foreign key errors
    if (sessionName !== 'unknown') {
      await this.prisma.whatsappInstance
        .upsert({
          where: { instanceName: sessionName },
          update: {},
          create: { instanceName: sessionName, status: 'WORKING' },
        })
        .catch(() => null);
    }

    if (payload?.event === 'message') {
      const message = payload.payload;
      const sender = message?.from;
      const text = message?.body;
      const mediaUrl = message?.mediaUrl; // Mock CLI image passing
      const timestamp = message?.timestamp
        ? new Date(message.timestamp * 1000).toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
          })
        : new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      if (message?.fromMe) {
        this.logger.log(
          `\n[WAHA BALASAN BOT KELUAR] Waktu: ${timestamp} | Sesi: ${payload.session} | Ke: ${message?.to || sender} | Isi:\n"${text}"\n`,
        );
      } else {
        this.logger.log(
          `\n[WAHA PESAN BARU - WHATSAPP] Waktu: ${timestamp} | Dari: ${sender} | Isi: "${text}"\n`,
        );
      }
    } else {
      this.logger.debug(`Received WAHA webhook event: ${payload?.event}`);
    }

    // Log every event into webhook_logs
    if (payload?.session && payload?.event) {
      await this.prisma.webhookLog
        .create({
          data: {
            instanceName: payload.session,
            event: payload.event,
            payload: payload,
          },
        })
        .catch((e) =>
          this.logger.warn(
            `Failed to create webhookLog for ${payload.session}: ${e.message}`,
          ),
        );
    }

    // Handle call.received: Tolak otomatis dan catat pesan notifikasi
    if (payload?.event === 'call.received' || payload?.event === 'call') {
      const callData = payload.payload;
      const caller =
        callData?.from || callData?.caller || callData?.participant;
      const callId = callData?.id;
      const sessionName = payload.session;

      this.logger.log(`[PANGGILAN MASUK] Dari: ${caller} | Call ID: ${callId}`);

      if (sessionName && callId) {
        this.wahaService.rejectCall(sessionName, callId).catch(() => null);
      }

      if (caller && sessionName) {
        const cleanCaller = caller
          .replace(/@(c\.us|s\.whatsapp\.net)$/i, '')
          .replace(/^\+/, '');
        try {
          const inst = await this.prisma.whatsappInstance.findUnique({
            where: { instanceName: sessionName },
          });
          const tenantId = inst?.tenantId || null;

          let contact = await this.prisma.contact.findFirst({
            where: {
              ...(tenantId ? { tenantId } : {}),
              OR: [
                { phone: cleanCaller },
                { phone: `+${cleanCaller}` },
                { phone: caller },
              ],
            },
          });
          if (!contact) {
            contact = await this.prisma.contact.create({
              data: {
                tenantId,
                phone: cleanCaller,
                name: `+${cleanCaller}`,
              },
            });
          }

          const conversation = await this.prisma.conversation.upsert({
            where: {
              instanceName_contactId: {
                instanceName: sessionName,
                contactId: contact.id,
              },
            },
            update: {
              lastMessageAt: new Date(),
              unreadCount: { increment: 1 },
            },
            create: {
              instanceName: sessionName,
              contactId: contact.id,
              unreadCount: 1,
            },
          });

          await this.prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderType: 'system',
              messageType: 'CALL',
              content: '📞 Panggilan WhatsApp masuk (Otomatis ditolak)',
              status: 'RECEIVED',
              metadata: { callData },
            },
          });

          // Kirim balasan otomatis ke penelpon
          await this.wahaService
            .sendMessage(
              sessionName,
              caller,
              'Halo, mohon maaf nomor ini beroperasi secara otomatis dan tidak dapat menerima panggilan suara/video. Silakan tinggalkan pesan melalui chat teks, kami akan segera merespons. Terima kasih! 🙏',
            )
            .catch(() => null);
        } catch (e) {
          this.logger.warn(`Failed to process call.received: ${e.message}`);
        }
      }
    }

    // ponytail: handle only 'message' event to prevent duplicate contacts/messages from outbound message.any webhooks
    if (payload?.event === 'message') {
      const message = payload.payload;
      const sessionName = payload.session;
      const isDirectPhone = (jid?: string): boolean =>
        Boolean(jid && /^\+?\d+(@(c\.us|s\.whatsapp\.net|lid))?$/.test(jid));

      const rawAlt =
        message?._data?.key?.remoteJidAlt ||
        message?._data?.remoteJidAlt ||
        message?._data?.senderAlt ||
        message?._data?.key?.participant;
      const realPhoneJid = rawAlt && !rawAlt.includes('@lid') ? rawAlt : null;

      let rawNumber = message?.fromMe
        ? message.to || message._data?.key?.remoteJid || message.from
        : realPhoneJid || message?.from;

      // Jika nomor berupa LID (@lid), minta WAHA resolve ke nomor telepon asli (@c.us)
      if (rawNumber && rawNumber.includes('@lid') && sessionName) {
        try {
          const wahaContact = await this.wahaService.getContact(
            sessionName,
            rawNumber,
          );
          if (wahaContact?.id && !wahaContact.id.includes('@lid')) {
            rawNumber = wahaContact.id;
          }
        } catch {}
      }

      const cleanNumber = (rawNumber || '')
        .replace(/@(c\.us|s\.whatsapp\.net|lid|broadcast)$/i, '')
        .replace(/^\+/, '');

      const contactNumber = cleanNumber || rawNumber;

      let currentConversationId: string | null = null;
      let activeContactId: string | null = null;
      let storedMediaUrl: string | null = null;
      const msgId = message.id?._serialized || message.id || 'unknown';

      const isAudioMsg = Boolean(
        message.type === 'ptt' ||
        message.type === 'audio' ||
        message.type === 'voice' ||
        (message._data &&
          (message._data.mimetype?.startsWith('audio/') ||
            message._data.type === 'ptt' ||
            message._data.type === 'audio')),
      );
      const isVideoMsg = Boolean(
        message.type === 'video' ||
        (message._data &&
          (message._data.mimetype?.startsWith('video/') ||
            message._data.type === 'video')),
      );
      const isImageMsg = Boolean(
        message.type === 'image' ||
        (!isAudioMsg &&
          !isVideoMsg &&
          message._data &&
          (message._data.mimetype?.startsWith('image/') ||
            message._data.type === 'image')),
      );
      const isMediaMsg = Boolean(
        message.hasMedia ||
        isAudioMsg ||
        isVideoMsg ||
        isImageMsg ||
        message.media?.url ||
        message.mediaUrl,
      );

      let extractedMediaUrl =
        message.media?.url ||
        message.mediaUrl ||
        (message.hasMedia && message.media ? message.media.url : null);

      if (!extractedMediaUrl && isMediaMsg && msgId && msgId !== 'unknown') {
        extractedMediaUrl = `/api/v1/waha/media/${sessionName}/${encodeURIComponent(msgId)}`;
      }

      let sessionTenantId: string | null = null;
      if (sessionName && isDirectPhone(rawNumber)) {
        const contactName =
          message._data?.notifyName || message.sender?.pushname || null;

        try {
          const inst = await this.prisma.whatsappInstance.findUnique({
            where: { instanceName: sessionName },
          });
          sessionTenantId = inst?.tenantId || null;

          const phoneConditions = [
            { phone: contactNumber },
            { phone: `+${contactNumber}` },
            { phone: rawNumber },
            ...(message?.from ? [{ phone: message.from }] : []),
          ];

          let contact = await this.prisma.contact.findFirst({
            where: {
              OR: phoneConditions,
              ...(sessionTenantId
                ? {
                    OR: [{ tenantId: sessionTenantId }, { tenantId: null }],
                  }
                : {}),
            },
          });

          // ponytail: fallback to phone match if tenantId was null on initial creation
          if (!contact) {
            contact = await this.prisma.contact.findFirst({
              where: { OR: phoneConditions },
            });
          }
          let contactId;
          const defaultAnonName = 'Anonim';
          const isValidPushName = Boolean(
            contactName &&
            contactName.trim() !== '' &&
            contactName.trim().toLowerCase() !== 'anonim' &&
            !contactName.startsWith('+') &&
            contactName !== contactNumber,
          );

          if (contact) {
            const existingMeta =
              (contact.metadata as Record<string, any>) || {};
            const hasSelfDeclared = Boolean(existingMeta.selfDeclaredName);
            const hasRealName =
              contact.name &&
              contact.name !== 'Anonim' &&
              !contact.name.startsWith('+') &&
              contact.name !== contact.phone &&
              contact.name !== 'Pelanggan Baru';

            const updatedMeta = {
              ...existingMeta,
              ...(contactName ? { profileName: contactName } : {}),
            };

            // Nama dari nomor (pushname) hanya mengisi jika belum ada nama yang dinyatakan sendiri
            const shouldApplyProfileName =
              !hasSelfDeclared &&
              (!hasRealName || contact.name === defaultAnonName);

            await this.prisma.contact.update({
              where: { id: contact.id },
              data: {
                phone: contactNumber,
                ...(sessionTenantId && !contact.tenantId
                  ? { tenantId: sessionTenantId }
                  : {}),
                ...(shouldApplyProfileName && isValidPushName
                  ? { name: contactName }
                  : {}),
                metadata: updatedMeta,
              },
            });
            contactId = contact.id;
          } else {
            const newContact = await this.prisma.contact.create({
              data: {
                tenantId: sessionTenantId,
                phone: contactNumber,
                name: isValidPushName ? contactName : defaultAnonName,
                metadata: {
                  ...(contactName
                    ? {
                        profileName: contactName,
                        nameSource: isValidPushName ? 'profile' : 'none',
                      }
                    : {}),
                },
              },
            });
            contactId = newContact.id;
          }
          activeContactId = contactId;

          const conversation = await this.prisma.conversation.upsert({
            where: {
              instanceName_contactId: {
                instanceName: sessionName,
                contactId: contactId,
              },
            },
            update: {
              lastMessageAt: new Date(
                message.timestamp ? message.timestamp * 1000 : Date.now(),
              ),
              unreadCount: message.fromMe ? 0 : { increment: 1 },
            },
            create: {
              instanceName: sessionName,
              contactId: contactId,
              unreadCount: message.fromMe ? 0 : 1,
            },
          });
          currentConversationId = conversation.id;

          const finalMessageType = isAudioMsg
            ? 'audio'
            : isVideoMsg
              ? 'video'
              : isImageMsg
                ? 'image'
                : isMediaMsg
                  ? message.type || 'media'
                  : message.type || 'text';

          let defaultContent = '';
          if (isAudioMsg) defaultContent = 'Mengirim pesan suara';
          else if (isVideoMsg) defaultContent = 'Mengirim video';
          else if (isImageMsg) defaultContent = 'Mengirim foto';
          else if (isMediaMsg) defaultContent = 'Mengirim media';

          // Strategi baru: unduh media yang diterima & simpan ke storage lokal
          // agar bisa langsung ditampilkan di dashboard monitoring.
          if (isMediaMsg && extractedMediaUrl) {
            storedMediaUrl = await this.wahaService.downloadAndStoreMedia(
              sessionName,
              msgId,
              extractedMediaUrl,
            );
          }

          const msgMetadata = {
            ...message,
            ...(extractedMediaUrl
              ? { mediaUrl: storedMediaUrl || extractedMediaUrl }
              : {}),
            ...(storedMediaUrl ? { localMediaUrl: storedMediaUrl } : {}),
          };

          const createdMsg = await this.prisma.message.upsert({
            where: { wahaMessageId: msgId },
            update: {
              status: message.fromMe ? 'SENT' : 'RECEIVED',
              messageType: finalMessageType,
              metadata: msgMetadata,
            },
            create: {
              wahaMessageId: msgId,
              conversationId: conversation.id,
              senderType: message.fromMe ? 'bot' : 'customer',
              messageType: finalMessageType,
              content: message.body || defaultContent,
              status: message.fromMe ? 'SENT' : 'RECEIVED',
              metadata: msgMetadata,
            },
          });

          // Broadcast SSE incoming customer message to dashboard
          ChatStreamService.getInstance()?.emit({
            type: 'message',
            data: {
              conversationId: conversation.id,
              instanceName: sessionName,
              message: createdMsg,
            },
          });
        } catch (e) {
          if (e.code === 'P2002') {
            this.logger.debug(
              `Concurrent webhook for ${contactNumber}, ignoring unique constraint.`,
            );
          } else {
            this.logger.warn(`Failed to save message to DB: ${e.message}`);
          }
        }
      }

      // Send to Omnichannel Queue (Hanya event 'message' dari nomor pribadi agar AI tidak membalas grup/status)
      // Abaikan jika sesi adalah sesi pengujian khusus (misal: test-video / silent / no-bot)
      const isTestSession =
        sessionName.toLowerCase().includes('test-video') ||
        sessionName.toLowerCase().includes('silent') ||
        sessionName.toLowerCase().includes('manual-only');

      if (
        !isTestSession &&
        payload.event === 'message' &&
        !message.fromMe &&
        isDirectPhone(message.from)
      ) {
        let text = message.body?.trim() || '';

        let quotedText = '';
        try {
          if (message.hasQuotedMsg) {
            quotedText =
              message._data?.quotedMsg?.body ||
              message._data?.message?.extendedTextMessage?.contextInfo
                ?.quotedMessage?.conversation ||
              message._data?.message?.extendedTextMessage?.contextInfo
                ?.quotedMessage?.extendedTextMessage?.text ||
              '';
          }
        } catch (e) {}

        if (quotedText) {
          text = `[Membalas pesan: "${quotedText}"]\n\n${text}`;
        }

        const deliverableSender =
          realPhoneJid && realPhoneJid.includes('@c.us')
            ? realPhoneJid
            : rawNumber && rawNumber.includes('@c.us')
              ? rawNumber
              : message.from;
        const sender = deliverableSender;
        const msgId = message.id?._serialized || message.id || 'unknown';
        // Hanya media gambar yang diteruskan ke mediaUrls Vision AI agar tidak crash saat menerima audio/video
        const mediaUrls: string[] | undefined =
          !isAudioMsg && !isVideoMsg
            ? message.media?.url
              ? [message.media.url]
              : message.mediaUrl
                ? [message.mediaUrl]
                : []
            : undefined;

        const audioUrl = isAudioMsg
          ? storedMediaUrl ||
            extractedMediaUrl ||
            message.media?.url ||
            message.mediaUrl
          : undefined;

        if (isAudioMsg && !text) {
          text = '[Pelanggan mengirimkan pesan suara / Voice Note]';
        }

        if (
          text ||
          (mediaUrls && mediaUrls.length > 0) ||
          audioUrl ||
          message.hasMedia
        ) {
          // Tangkap ID conversation aktif dari webhook saat ini
          const activeConvId = currentConversationId;

          // Helper: simpan pesan balasan bot ke database agar tampil di monitoring
          const saveBotReply = async (
            replyText: string,
            msgType: string,
            meta?: any,
          ) => {
            try {
              let targetConversationId = activeConvId;
              if (!targetConversationId) {
                const replyContactNumber = (message.from || '').replace(
                  /@c\.us|@s\.whatsapp\.net|@lid/g,
                  '',
                );
                const contact = await this.prisma.contact.findFirst({
                  where: {
                    OR: [
                      { phone: contactNumber },
                      { phone: rawNumber },
                      { phone: replyContactNumber },
                      { phone: { contains: replyContactNumber } },
                      ...(message?.from ? [{ phone: message.from }] : []),
                    ],
                  },
                });
                if (!contact) return;
                const conv = await this.prisma.conversation.findFirst({
                  where: {
                    instanceName: sessionName,
                    contactId: contact.id,
                  },
                });
                if (!conv) return;
                targetConversationId = conv.id;
              }

              const botMsg = await this.prisma.message.create({
                data: {
                  conversationId: targetConversationId,
                  senderType: 'bot',
                  messageType: msgType,
                  content: replyText || '',
                  status: 'SENT',
                  metadata: meta || {},
                },
              });
              await this.prisma.conversation.update({
                where: { id: targetConversationId },
                data: { lastMessageAt: new Date() },
              });

              // Broadcast SSE bot reply to dashboard
              ChatStreamService.getInstance()?.emit({
                type: 'message',
                data: {
                  conversationId: targetConversationId,
                  instanceName: sessionName,
                  message: botMsg,
                },
              });
            } catch (e) {
              this.logger.warn(`Failed to save bot reply: ${e.message}`);
            }
          };

          const incomingMessage: IncomingMessage = {
            senderId: sender,
            text: text,
            mediaUrls: mediaUrls,
            audioUrl: audioUrl,
            provider: 'WAHA',
            sessionName: sessionName,
            replyCallback: async (reply) => {
              this.logger.log(
                `[WahaController] AI selesai menyusun balasan (${reply.text?.length || 0} karakter), mengirim ke ${sender}...`,
              );
              if (reply.text && reply.text.length > 0) {
                if (sessionName === 'CLI_TEST_SESSION') {
                  this.cliOutputQueue.push({
                    type: 'text',
                    text: `[Waha Bot]: ${reply.text}`,
                  });
                } else {
                  await this.wahaService.sendMessage(
                    sessionName,
                    sender,
                    reply.text,
                  );
                  await saveBotReply(reply.text, 'text');
                }
              }
              if (reply.order) {
                const instance = await this.prisma.whatsappInstance.findUnique({
                  where: { instanceName: sessionName },
                });
                if (instance?.tenantId) {
                  const tenant = await this.prisma.tenant.findUnique({
                    where: { id: instance.tenantId },
                  });

                  await this.prisma.salesRecord
                    .create({
                      data: {
                        receiptNumber: `INV-${Date.now()}`,
                        tenantId: instance.tenantId,
                        quantity: reply.order.quantity || 1,
                        totalPrice: reply.order.totalPrice || 0,
                        customerName:
                          reply.order.customerName || 'Pelanggan WA',
                        notes: reply.order.notes || '',
                        source: 'WAHA',
                        attributes: reply.order,
                      },
                    })
                    .catch((e) =>
                      this.logger.warn(`Order save failed: ${e.message}`),
                    );

                  if (tenant?.ownerChatId) {
                    const notifText = `🔥 *Pesanan Baru Masuk!*\n\nDari: ${reply.order.customerName || 'Pelanggan'}\nItem: ${reply.order.items || '-'}\nTotal: Rp${reply.order.totalPrice || 0}\n\nKetik "proses pesanan ini" jika sudah siap.`;
                    if (sessionName === 'CLI_TEST_SESSION') {
                      this.cliOutputQueue.push({
                        type: 'text',
                        text: `[NOTIF OWNER]: ${notifText}`,
                      });
                    } else {
                      await this.wahaService.sendMessage(
                        sessionName,
                        tenant.ownerChatId,
                        notifText,
                      );
                    }
                  }
                }
              }
              if (reply.lead) {
                try {
                  const replyContactNumber = (message.from || '').replace(
                    /@c\.us|@s\.whatsapp\.net|@lid/g,
                    '',
                  );
                  const contact = activeContactId
                    ? await this.prisma.contact.findUnique({
                        where: { id: activeContactId },
                      })
                    : await this.prisma.contact.findFirst({
                        where: {
                          ...(sessionTenantId
                            ? { tenantId: sessionTenantId }
                            : {}),
                          OR: [
                            { phone: contactNumber },
                            { phone: rawNumber },
                            { phone: replyContactNumber },
                            { phone: { contains: replyContactNumber } },
                            ...(message?.from ? [{ phone: message.from }] : []),
                          ],
                        },
                      });
                  if (contact) {
                    const existingMeta =
                      (contact.metadata as Record<string, any>) || {};
                    const existingLogs: Array<{
                      status?: string;
                      notes?: string;
                      timestamp: string;
                    }> = Array.isArray(existingMeta.statusLogs)
                      ? [...existingMeta.statusLogs]
                      : [];

                    const cleanLeadNotes =
                      reply.lead.notes && typeof reply.lead.notes === 'string'
                        ? reply.lead.notes.trim()
                        : '';
                    const newStatus = reply.lead.status || contact.status;
                    const lastLog = existingLogs[existingLogs.length - 1];
                    const isChanged =
                      !lastLog ||
                      lastLog.status !== newStatus ||
                      (cleanLeadNotes && lastLog.notes !== cleanLeadNotes);

                    if (isChanged && (newStatus || cleanLeadNotes)) {
                      existingLogs.push({
                        status: newStatus,
                        notes: cleanLeadNotes || contact.notes || '',
                        timestamp: new Date().toISOString(),
                      });
                    }

                    const updatedMeta = {
                      ...existingMeta,
                      ...(reply.lead.perumahan && {
                        perumahan: reply.lead.perumahan,
                      }),
                      ...(reply.lead.tipeUnit && {
                        tipeUnit: reply.lead.tipeUnit,
                      }),
                      ...(reply.lead.hargaUnit && {
                        hargaUnit: reply.lead.hargaUnit,
                      }),
                      statusLogs: existingLogs,
                    };

                    const latestNotes = cleanLeadNotes || contact.notes;

                    await this.prisma.contact.update({
                      where: { id: contact.id },
                      data: {
                        ...(reply.lead.customerName &&
                          (!contact.name ||
                            contact.name === contact.phone ||
                            contact.name.startsWith('+')) && {
                            name: reply.lead.customerName,
                          }),
                        ...(reply.lead.status && { status: reply.lead.status }),
                        ...(latestNotes !== undefined && {
                          notes: latestNotes,
                        }),
                        metadata: updatedMeta,
                      },
                    });
                  }
                } catch (e) {
                  this.logger.warn(`Lead auto-update failed: ${e.message}`);
                }
              }
              if (reply.images && reply.images.length > 0) {
                for (let img of reply.images) {
                  // ponytail: on-demand realtime siteplan generation saat diminta customer
                  if (
                    this.availabilityService &&
                    (img.url?.includes('siteplan') ||
                      /siteplan|denah/i.test(img.caption || '') ||
                      /siteplan|denah/i.test(reply.text || ''))
                  ) {
                    try {
                      const instance =
                        await this.prisma.whatsappInstance.findUnique({
                          where: { instanceName: sessionName },
                          select: { tenantId: true },
                        });
                      const effectiveTenantId =
                        instance?.tenantId || sessionTenantId;

                      const matchedGroup =
                        (effectiveTenantId && reply.lead?.perumahan
                          ? await this.prisma.resourceGroup.findFirst({
                              where: {
                                tenantId: effectiveTenantId,
                                name: {
                                  contains: reply.lead.perumahan,
                                  mode: 'insensitive' as const,
                                },
                              },
                            })
                          : null) ||
                        (effectiveTenantId
                          ? await this.prisma.resourceGroup.findFirst({
                              where: { tenantId: effectiveTenantId },
                            })
                          : null) ||
                        (await this.prisma.resourceGroup.findFirst({
                          where: {
                            tenant: {
                              whatsappInstances: {
                                some: { instanceName: sessionName },
                              },
                            },
                          },
                        }));
                      if (matchedGroup) {
                        let isIllustrationActive = true;
                        let templates = matchedGroup.pricingTemplates as any;
                        if (typeof templates === 'string') {
                          try {
                            templates = JSON.parse(templates);
                          } catch {}
                        }
                        if (templates && typeof templates === 'object') {
                          if (
                            templates.isIllustrationActive === false ||
                            templates.isSiteplanActive === false
                          ) {
                            isIllustrationActive = false;
                          }
                        }

                        if (!isIllustrationActive) {
                          // ponytail: jika ilustrasi dinonaktifkan, jangan kirim gambar ke WhatsApp (bot arahkan ke marketing)
                          continue;
                        }

                        const freshSiteplan =
                          await this.availabilityService.generateSiteplanImage(
                            matchedGroup.id,
                          );
                        img = {
                          ...img,
                          url: freshSiteplan.url,
                          caption:
                            img.caption ||
                            `Denah Siteplan ${matchedGroup.name}`,
                        };
                      }
                    } catch (e: any) {
                      this.logger.warn(
                        `Failed to generate on-demand siteplan: ${e.message}`,
                      );
                    }
                  }

                  if (sessionName === 'CLI_TEST_SESSION') {
                    this.cliOutputQueue.push({
                      type: 'image',
                      text: `[Waha Bot img] URL: ${img.url}, Caption: ${img.caption}`,
                    });
                  } else {
                    const isDoc =
                      /\.(pdf|doc|docx|xls|xlsx|csv|txt)($|\?)/i.test(img.url);
                    await this.wahaService.sendMedia(
                      sessionName,
                      sender,
                      img.url,
                      img.caption || '',
                    );
                    await saveBotReply(
                      img.caption ||
                        (isDoc ? 'Mengirim dokumen' : 'Mengirim gambar'),
                      isDoc ? 'document' : 'image',
                      { mediaUrl: img.url },
                    );
                  }
                }
              }
              if (reply.videos && reply.videos.length > 0) {
                for (const vid of reply.videos) {
                  if (sessionName === 'CLI_TEST_SESSION') {
                    this.cliOutputQueue.push({
                      type: 'video',
                      text: `[Waha Bot video] URL: ${vid.url}, Caption: ${vid.caption}`,
                    });
                  } else {
                    await this.wahaService.sendVideo(
                      sessionName,
                      sender,
                      vid.url,
                      vid.caption || '',
                    );
                    await saveBotReply(
                      vid.caption || 'Mengirim video',
                      'video',
                      { mediaUrl: vid.url },
                    );
                  }
                }
              }
            },
          };
          this.omnichannelQueue.enqueue(incomingMessage);
        }
      }
    } else if (payload?.event === 'message.ack') {
      const ack = payload.payload;
      const msgId = ack.id?._serialized || ack.id;
      const statuses = [
        'ERROR',
        'PENDING',
        'SENT',
        'DELIVERED',
        'READ',
        'PLAYED',
      ];
      // WAHA ack values: 0=pending, 1=sent, 2=delivered, 3=read, 4=played, -1=error
      const statusStr = statuses[ack.ack + 1] || 'UNKNOWN';

      if (msgId) {
        await this.prisma.message
          .updateMany({
            where: { wahaMessageId: msgId },
            data: { status: statusStr },
          })
          .catch((e) => this.logger.warn(`Failed to update ACK: ${e.message}`));
      }
    } else if (payload?.event === 'session.status') {
      const sessionName = payload.session;
      const status = payload.payload?.status;
      if (sessionName && status) {
        const updateData: any = { status: status };
        if (status === 'STOPPED') {
          updateData.lastConnectedAt = null; // or keep it and use disconnectedAt for WhatsappSession
        } else if (status === 'WORKING') {
          updateData.lastConnectedAt = new Date();
        }
        await this.prisma.whatsappInstance
          .update({
            where: { instanceName: sessionName },
            data: updateData,
          })
          .catch((e) =>
            this.logger.warn(`Failed to update status for ${sessionName}`),
          );
      }
    }

    return { status: 'success' };
  }
}
