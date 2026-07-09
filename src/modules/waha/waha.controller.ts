import { Controller, Get, Post, Delete, Body, Param, Req, Res, Logger, StreamableFile } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { WahaService } from './waha.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Controller('api/v1/waha')
export class WahaController {
  private readonly logger = new Logger(WahaController.name);
  constructor(
    private readonly wahaService: WahaService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('instances')
  async createInstance(@Body('name') name: string, @Body('webhookUrl') webhookUrl?: string, @Body('channelAccountId') channelAccountId?: string) {
    try {
      return await this.wahaService.startSession(name, webhookUrl, channelAccountId);
    } catch (error) {
      if (error.response?.status === 422) {
         this.logger.warn(`Session ${name} already exists or is invalid.`);
         return { message: 'Session already running or invalid state. Ignoring start command.', status: 'ignored' };
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
  async deleteInstance(@Param('id') id: string) {
    try {
      await this.wahaService.logoutSession(id);
    } catch (e) {
      this.logger.warn(`Failed to logout session ${id} from WAHA, ignoring: ${e.message}`);
    }
    await this.prisma.whatsappInstance.delete({ where: { instanceName: id } }).catch(() => null);
    return { success: true };
  }

  @SkipThrottle()
  @Get('instances')
  async getInstances() {
    return this.wahaService.getSessions();
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
        error: error.message
      });
    }
  }

  @Post('instances/:id/send')
  async sendMessage(@Param('id') id: string, @Body() body: { chatId: string, text: string }) {
    // 1. Create Conversation if not exists
    const conversation = await this.prisma.conversation.upsert({
      where: { instanceName_contactNumber: { instanceName: id, contactNumber: body.chatId } },
      update: { lastMessageAt: new Date() },
      create: { instanceName: id, contactNumber: body.chatId, unreadCount: 0 }
    });

    // 2. Create Message as PENDING
    const dbMsg = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'agent', // or user
        messageType: 'text',
        content: body.text,
        status: 'PENDING',
      }
    });

    // 3. Send to WAHA (it has random delay inside)
    this.wahaService.sendMessage(id, body.chatId, body.text).then(async (result) => {
      // Note: Waha response might contain the msg id, but webhooks will also catch it.
      // We will let webhook handle the final ACK, or update it here if WAHA returns the ID.
      if (result && result.id) {
         await this.prisma.message.update({
           where: { id: dbMsg.id },
           data: { wahaMessageId: result.id, status: 'SENT' }
         }).catch(() => null);
      }
    }).catch(async (e) => {
       await this.prisma.message.update({
         where: { id: dbMsg.id },
         data: { status: 'ERROR' }
       }).catch(() => null);
    });

    return { success: true, messageId: dbMsg.id };
  }

  @SkipThrottle()
  @Get('instances/:id/logs')
  async getLogs(@Param('id') id: string) {
    return this.prisma.webhookLog.findMany({
      where: { instanceName: id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  @Post('webhook')
  async handleWebhook(@Body() payload: any) {
    this.logger.log(`Received WAHA webhook event: ${payload?.event}`);
    console.log(JSON.stringify(payload, null, 2));
    
    // Log every event into webhook_logs
    if (payload?.session && payload?.event) {
      await this.prisma.webhookLog.create({
        data: {
          instanceName: payload.session,
          event: payload.event,
          payload: payload
        }
      }).catch(e => this.logger.warn(`Failed to create webhookLog for ${payload.session}: ${e.message}`));
    }

    // Process message events
    if (payload?.event === 'message' || payload?.event === 'message.any') {
      const message = payload.payload;
      const sessionName = payload.session;
      
      if (sessionName && message.from && !message.from.includes('@g.us')) {
        const contactNumber = message.fromMe ? message.to : message.from;
        const contactName = message._data?.notifyName || message.sender?.pushname || null;
        const msgId = message.id?._serialized || message.id || 'unknown';

        try {
          const conversation = await this.prisma.conversation.upsert({
            where: {
              instanceName_contactNumber: { instanceName: sessionName, contactNumber }
            },
            update: {
              contactName: contactName || undefined,
              lastMessageAt: new Date(message.timestamp ? message.timestamp * 1000 : Date.now()),
              unreadCount: message.fromMe ? undefined : { increment: 1 }
            },
            create: {
              instanceName: sessionName,
              contactNumber,
              contactName,
              unreadCount: message.fromMe ? 0 : 1,
            }
          });

          await this.prisma.message.upsert({
            where: { wahaMessageId: msgId },
            update: {
              status: message.fromMe ? 'SENT' : 'RECEIVED'
            },
            create: {
              wahaMessageId: msgId,
              conversationId: conversation.id,
              senderType: message.fromMe ? 'bot' : 'customer',
              messageType: message.type || 'text',
              content: message.body || '',
              status: message.fromMe ? 'SENT' : 'RECEIVED',
              metadata: message
            }
          });
        } catch (e) {
          this.logger.warn(`Failed to save message to DB: ${e.message}`);
        }
      }
      
      // Auto-reply logic can remain for 'message' only
      if (payload.event === 'message' && !message.fromMe) {
        const text = message.body?.toLowerCase();
        const sender = message.from;
        if (text === 'ping') {
           const replyText = 'Pong! Bot is active 🚀';
           // Save bot reply to DB
           const conversation = await this.prisma.conversation.findUnique({
             where: { instanceName_contactNumber: { instanceName: payload.session, contactNumber: sender } }
           });
           if (conversation) {
             const dbMsg = await this.prisma.message.create({
               data: {
                 conversationId: conversation.id,
                 senderType: 'bot',
                 messageType: 'text',
                 content: replyText,
                 status: 'PENDING',
               }
             });
             this.wahaService.sendMessage(payload.session, sender, replyText).then(async (res) => {
               if (res && res.id) {
                 await this.prisma.message.update({
                   where: { id: dbMsg.id },
                   data: { wahaMessageId: res.id, status: 'SENT' }
                 }).catch(() => null);
               }
             }).catch(() => null);
           } else {
             await this.wahaService.sendMessage(payload.session, sender, replyText);
           }
        }
      }
    } else if (payload?.event === 'message.ack') {
      const ack = payload.payload;
      const msgId = ack.id?._serialized || ack.id;
      const statuses = ['ERROR', 'PENDING', 'SENT', 'DELIVERED', 'READ', 'PLAYED'];
      // WAHA ack values: 0=pending, 1=sent, 2=delivered, 3=read, 4=played, -1=error
      const statusStr = statuses[ack.ack + 1] || 'UNKNOWN';
      
      if (msgId) {
        await this.prisma.message.updateMany({
          where: { wahaMessageId: msgId },
          data: { status: statusStr }
        }).catch(e => this.logger.warn(`Failed to update ACK: ${e.message}`));
      }
    } else if (payload?.event === 'session.status') {
      const sessionName = payload.session;
      const status = payload.payload?.status;
      if (sessionName && status) {
        let updateData: any = { status: status };
        if (status === 'STOPPED') {
          updateData.lastConnectedAt = null; // or keep it and use disconnectedAt for WhatsappSession
        } else if (status === 'WORKING') {
          updateData.lastConnectedAt = new Date();
        }
        await this.prisma.whatsappInstance.update({
          where: { instanceName: sessionName },
          data: updateData
        }).catch(e => this.logger.warn(`Failed to update status for ${sessionName}`));
      }
    }
    
    return { status: 'success' };
  }
}
