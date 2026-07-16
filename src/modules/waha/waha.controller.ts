import { Controller, Get, Post, Delete, Body, Param, Req, Res, Logger, StreamableFile } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { WahaService } from './waha.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Controller('api/v1/waha')
export class WahaController {
  private readonly logger = new Logger(WahaController.name);
  
  private messageBuffer = new Map<string, { texts: string[], msgIds: Set<string>, timer: NodeJS.Timeout }>();
  private processingQueue: Array<{ sessionName: string, sender: string, combinedText: string }> = [];
  private isProcessingQueue = false;

  constructor(
    private readonly wahaService: WahaService,
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  @Post('instances')
  async createInstance(@Body('name') name: string, @Body('webhookUrl') webhookUrl?: string, @Body('channelAccountId') channelAccountId?: string) {
    try {
      const finalWebhookUrl = process.env.WEBHOOK_URL || webhookUrl;
      return await this.wahaService.startSession(name, finalWebhookUrl, channelAccountId);
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
    const contact = await this.prisma.contact.upsert({
      where: { phone: body.chatId },
      update: {},
      create: { name: body.chatId, phone: body.chatId }
    });

    // 1. Create Conversation if not exists
    const conversation = await this.prisma.conversation.upsert({
      where: { instanceName_contactId: { instanceName: id, contactId: contact.id } },
      update: { lastMessageAt: new Date() },
      create: { instanceName: id, contactId: contact.id, unreadCount: 0 }
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
    if (payload?.event === 'message') {
      const message = payload.payload;
      const sender = message?.from;
      const text = message?.body;
      const timestamp = message?.timestamp ? new Date(message.timestamp * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      this.logger.log(`\n[WAHA PESAN BARU] Waktu: ${timestamp} | Dari: ${sender} | Isi: "${text}"\n`);
    } else {
      this.logger.log(`Received WAHA webhook event: ${payload?.event}`);
    }
    
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
        const contactNumber = message.fromMe 
          ? (message.to || message._data?.key?.remoteJid || message.from)
          : message.from;
        const contactName = message._data?.notifyName || message.sender?.pushname || null;
        const msgId = message.id?._serialized || message.id || 'unknown';

        try {
          const contact = await this.prisma.contact.findUnique({ where: { phone: contactNumber } });
          let contactId;
          if (contact) {
            await this.prisma.contact.update({
              where: { id: contact.id },
              data: {
                name: contactName || undefined
              }
            });
            contactId = contact.id;
          } else {
            const newContact = await this.prisma.contact.create({
              data: {
                phone: contactNumber,
                name: contactName || contactNumber
              }
            });
            contactId = newContact.id;
          }

          const conversation = await this.prisma.conversation.upsert({
            where: {
              instanceName_contactId: { instanceName: sessionName, contactId: contactId }
            },
            update: {
              lastMessageAt: new Date(message.timestamp ? message.timestamp * 1000 : Date.now()),
              unreadCount: message.fromMe ? 0 : { increment: 1 }
            },
            create: {
              instanceName: sessionName,
              contactId: contactId,
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
          if (e.code === 'P2002') {
             this.logger.debug(`Concurrent webhook for ${contactNumber}, ignoring unique constraint.`);
          } else {
             this.logger.warn(`Failed to save message to DB: ${e.message}`);
          }
        }
      }
      
      // Debounce Auto-reply logic
      if ((payload.event === 'message' || payload.event === 'message.any') && !message.fromMe) {
        const text = message.body?.trim();
        const sender = message.from;
        const msgId = message.id?._serialized || message.id || 'unknown';

        if (text) {
             const bufferKey = `${sessionName}_${sender}`;
             const existing = this.messageBuffer.get(bufferKey);
             
             if (existing) {
               if (!existing.msgIds.has(msgId)) {
                 clearTimeout(existing.timer);
                 existing.texts.push(text);
                 existing.msgIds.add(msgId);
                 
                 // Reset 10-second debounce
                 existing.timer = setTimeout(() => {
                   const buffered = this.messageBuffer.get(bufferKey);
                   if (buffered) {
                     const combinedText = buffered.texts.join('\n');
                     this.processingQueue.push({ sessionName, sender, combinedText });
                     this.messageBuffer.delete(bufferKey);
                     
                     this.logger.debug(`[Debounce] 10s passed. Queueing message from ${sender}. Queue length: ${this.processingQueue.length}`);
                     this.processQueue();
                   }
                 }, 10000);
               }
             } else {
               this.messageBuffer.set(bufferKey, {
                 texts: [text],
                 msgIds: new Set([msgId]),
                 timer: setTimeout(() => {
                   const buffered = this.messageBuffer.get(bufferKey);
                   if (buffered) {
                     const combinedText = buffered.texts.join('\n');
                     this.processingQueue.push({ sessionName, sender, combinedText });
                     this.messageBuffer.delete(bufferKey);
                     
                     this.logger.debug(`[Debounce] 10s passed. Queueing message from ${sender}. Queue length: ${this.processingQueue.length}`);
                     this.processQueue();
                   }
                 }, 10000)
               });
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

  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.processingQueue.length > 0) {
      const task = this.processingQueue.shift();
      if (!task) continue;

      const { sessionName, sender, combinedText } = task;

      try {
        const instanceData = await this.prisma.whatsappInstance.findUnique({
          where: { instanceName: sessionName },
          include: { channelAccount: true }
        });
        
        const isMarketingChannel = instanceData?.channelAccount?.name?.toLowerCase().includes('marketing');

        if (isMarketingChannel) {
          const contact = await this.prisma.contact.findUnique({ where: { phone: sender } });
          const conversation = contact ? await this.prisma.conversation.findUnique({
            where: { instanceName_contactId: { instanceName: sessionName, contactId: contact.id } }
          }) : null;
          
          let chatHistory: any[] = [];
          if (conversation) {
            chatHistory = await this.prisma.message.findMany({
              where: { conversationId: conversation.id },
              orderBy: { createdAt: 'desc' },
              take: 10
            });
            chatHistory.reverse();
          }

          const aiResponse = await this.aiService.generateLunaResponse(combinedText, sender, chatHistory);
          
          const gdriveRegex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)(?:\/[^\s]*)?/gi;
          const genericHostRegex = /https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:ibb\.co\.com|ibb\.co|postimg\.cc|postimages\.org)[^\s]*/gi;
          const extensionRegex = /https?:\/\/[^\s]+\.(?:jpg|jpeg|png|webp|gif)/gi;
          
          const imageUrls: { url: string, rawText: string }[] = [];

          let match;
          while ((match = gdriveRegex.exec(aiResponse)) !== null) {
            imageUrls.push({ url: `https://drive.google.com/uc?export=download&id=${match[1]}`, rawText: match[0] });
          }
          while ((match = extensionRegex.exec(aiResponse)) !== null) {
            imageUrls.push({ url: match[0], rawText: match[0] });
          }
          while ((match = genericHostRegex.exec(aiResponse)) !== null) {
            imageUrls.push({ url: match[0], rawText: match[0] });
          }

          this.logger.debug(`[AI RAW RESPONSE] ${aiResponse}`);
          this.logger.debug(`[EXTRACTED IMAGES] ${JSON.stringify(imageUrls)}`);

          if (imageUrls.length > 0) {
            let cleanCaption = aiResponse;
            for (const img of imageUrls) {
              cleanCaption = cleanCaption.replace(img.rawText, '');
            }
            cleanCaption = cleanCaption.replace(/Link Gambar:\s*\[?\]?/gi, '').trim();
            
            await this.wahaService.sendImage(sessionName, sender, imageUrls[0].url, cleanCaption);
            
            for (let i = 1; i < imageUrls.length; i++) {
              await this.wahaService.sendImage(sessionName, sender, imageUrls[i].url, '');
            }
          } else {
            await this.wahaService.sendMessage(sessionName, sender, aiResponse);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to process queue task for ${sender}: ${error.message}`);
      }
    }

    this.isProcessingQueue = false;
  }
}
