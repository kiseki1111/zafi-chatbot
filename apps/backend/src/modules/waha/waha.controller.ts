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
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { WahaService } from './waha.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OmnichannelQueueService } from '../../core/omnichannel/omnichannel-queue.service';
import { IncomingMessage } from '../../core/omnichannel/interfaces/incoming-message.interface';

@Controller('api/v1/waha')
export class WahaController {
  private readonly logger = new Logger(WahaController.name);

  // Queue for CLI Mock output
  private cliOutputQueue: any[] = [];

  constructor(
    private readonly wahaService: WahaService,
    private readonly prisma: PrismaService,
    private readonly omnichannelQueue: OmnichannelQueueService,
  ) {}

  @Post('instances')
  async createInstance(
    @Body('name') name: string,
    @Body('webhookUrl') webhookUrl?: string,
    @Body('channelAccountId') channelAccountId?: string,
    @Body('tenantId') tenantId?: string,
    @Req() req?: any,
  ) {
    try {
      const effectiveTenantId =
        tenantId && tenantId !== 'undefined' && tenantId !== 'null'
          ? tenantId
          : req?.user?.tenantId;
      const webhooks: string[] = [];

      if (process.env.WEBHOOK_URL) {
        webhooks.push(process.env.WEBHOOK_URL);
      }
      if (
        webhookUrl &&
        !webhookUrl.includes('localhost') &&
        !webhookUrl.includes('127.0.0.1')
      ) {
        webhooks.push(webhookUrl);
      }

      // Selalu masukkan 4 perlindungan ganda ini, tidak peduli apa isi dari .env mentor
      webhooks.push('http://backend:3030/api/v1/waha/webhook');
      webhooks.push('http://iqbal-backend:3030/api/v1/waha/webhook');
      webhooks.push('http://172.17.0.1:3030/api/v1/waha/webhook'); // Docker default gateway
      webhooks.push('http://103.30.195.145:3030/api/v1/waha/webhook');

      this.logger.log(
        `[WAHA] Mendaftarkan total ${webhooks.length} Webhook sekaligus: ${webhooks.join(', ')}`,
      );

      return await this.wahaService.startSession(
        name,
        webhooks,
        channelAccountId,
        effectiveTenantId,
      );
    } catch (error) {
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
        throw new ForbiddenException(
          'Akses ditolak: sesi ini milik akun lain',
        );
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
    const tenantId =
      req.query?.tenantId &&
      req.query.tenantId !== 'undefined' &&
      req.query.tenantId !== 'null'
        ? req.query.tenantId
        : req.user?.tenantId;
    return this.wahaService.getSessions(tenantId);
  }

  // Endpoint baru: ambil langsung dari database (bukan dari WAHA API)
  // Opsional: filter by tenantId jika diberikan
  @SkipThrottle()
  @Get('instances/db')
  async getInstancesFromDb(@Req() req: any) {
    // Coba ambil tenantId dari query param atau dari user session
    const tenantId =
      req.query?.tenantId &&
      req.query.tenantId !== 'undefined' &&
      req.query.tenantId !== 'null'
        ? req.query.tenantId
        : req.user?.tenantId;

    // Jika ada tenantId, filter hanya instance untuk tenant tersebut
    // Jika tidak ada, kembalikan semua instance (untuk backward compatibility / superadmin)
    const where = tenantId ? { tenantId } : {};

    return this.prisma.whatsappInstance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
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
      this.logger.error(`Failed to get QR code for ${id}: ${error.message}`);
      return res.status(error.response?.status || 500).send({
        error: error.message,
      });
    }
  }

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
      return res.send(media.data);
    } catch (error) {
      this.logger.warn(`Failed to proxy media ${messageId}: ${error.message}`);
      return res.status(error.response?.status || 500).send({
        error: error.message,
      });
    }
  }

  @Post('instances/:id/send')
  async sendMessage(
    @Param('id') id: string,
    @Body() body: { chatId: string; text: string },
  ) {
    const contact = await this.prisma.contact.upsert({
      where: { phone: body.chatId },
      update: {},
      create: { name: body.chatId, phone: body.chatId },
    });

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

  @Post('webhook')
  async handleWebhook(@Body() payload: any) {
    if (!payload) return { status: 'ignored' };

    const sessionName = payload.session || 'unknown';

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
      this.logger.log(
        `\n[WAHA PESAN BARU - WHATSAPP] Waktu: ${timestamp} | Dari: ${sender} | Isi: "${text}"\n`,
      );
    } else {
      this.logger.log(`Received WAHA webhook event: ${payload?.event}`);
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

    // Process message events: Gunakan HANYA event 'message' agar tidak dobel dengan 'message.any'
    if (payload?.event === 'message') {
      const message = payload.payload;
      const sessionName = payload.session;

      if (sessionName && message.from && !message.from.includes('@g.us')) {
        const contactNumber = message.fromMe
          ? message.to || message._data?.key?.remoteJid || message.from
          : message.from;
        const contactName =
          message._data?.notifyName || message.sender?.pushname || null;
        const msgId = message.id?._serialized || message.id || 'unknown';

        const isMediaMsg = Boolean(
          message.hasMedia ||
          message.type === 'image' ||
          message.media?.url ||
          message.mediaUrl ||
          (message._data && (message._data.mimetype?.startsWith('image/') || message._data.type === 'image'))
        );

        let extractedMediaUrl =
          message.media?.url ||
          message.mediaUrl ||
          (message.hasMedia && message.media ? message.media.url : null);

        if (!extractedMediaUrl && isMediaMsg && msgId && msgId !== 'unknown') {
          extractedMediaUrl = `/api/v1/waha/media/${sessionName}/${encodeURIComponent(msgId)}`;
        }

        try {
          const contact = await this.prisma.contact.findUnique({
            where: { phone: contactNumber },
          });
          let contactId;
          if (contact) {
            await this.prisma.contact.update({
              where: { id: contact.id },
              data: {
                name: contactName || undefined,
              },
            });
            contactId = contact.id;
          } else {
            const newContact = await this.prisma.contact.create({
              data: {
                phone: contactNumber,
                name: contactName || contactNumber,
              },
            });
            contactId = newContact.id;
          }

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

          const isMediaMsg =
            Boolean(
              message.hasMedia ||
              message.type === 'image' ||
              message.media?.url ||
              message.mediaUrl ||
              (message._data && (message._data.mimetype?.startsWith('image/') || message._data.type === 'image'))
            );

          let extractedMediaUrl =
            message.media?.url ||
            message.mediaUrl ||
            (message.hasMedia && message.media ? message.media.url : null);

          // Jika WAHA menyimpan media secara lokal (WAHA media manager), buat URL proxy / langsung ke WAHA media
          if (!extractedMediaUrl && isMediaMsg && msgId && msgId !== 'unknown') {
            extractedMediaUrl = `/api/v1/waha/media/${sessionName}/${encodeURIComponent(msgId)}`;
          }

          const finalMessageType = isMediaMsg
            ? 'image'
            : message.type || 'text';

          await this.prisma.message.upsert({
            where: { wahaMessageId: msgId },
            update: {
              status: message.fromMe ? 'SENT' : 'RECEIVED',
            },
            create: {
              wahaMessageId: msgId,
              conversationId: conversation.id,
              senderType: message.fromMe ? 'bot' : 'customer',
              messageType: finalMessageType,
              content: message.body || (isMediaMsg ? 'Mengirim foto' : ''),
              status: message.fromMe ? 'SENT' : 'RECEIVED',
              metadata: {
                ...message,
                ...(extractedMediaUrl ? { mediaUrl: extractedMediaUrl } : {}),
              },
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

      // Send to Omnichannel Queue (Hanya event 'message' agar AI tidak membalas 2x)
      if (payload.event === 'message' && !message.fromMe) {
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

        const sender = message.from;
        const mediaUrls = message.media?.url
          ? [message.media.url]
          : message.mediaUrl
          ? [message.mediaUrl]
          : [];

        if (text || mediaUrls.length > 0 || message.hasMedia) {
          const incomingMessage: IncomingMessage = {
            senderId: sender,
            text: text,
            mediaUrls: mediaUrls,
            provider: 'WAHA',
            sessionName: sessionName,
            replyCallback: async (reply) => {
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
              if (reply.images && reply.images.length > 0) {
                for (const img of reply.images) {
                  if (sessionName === 'CLI_TEST_SESSION') {
                    this.cliOutputQueue.push({
                      type: 'image',
                      text: `[Waha Bot img] URL: ${img.url}, Caption: ${img.caption}`,
                    });
                  } else {
                    await this.wahaService.sendImage(
                      sessionName,
                      sender,
                      img.url,
                      img.caption || '',
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
