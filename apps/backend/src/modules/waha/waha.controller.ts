import { Controller, Get, Post, Delete, Body, Param, Req, Res, Logger, StreamableFile } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { WahaService } from './waha.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { DesignFlowService } from '../telegram/design/design-flow.service';
import { DesignSessionService } from '../telegram/design/design-session.service';
import TelegramBot from 'node-telegram-bot-api';

@Controller('api/v1/waha')
export class WahaController {
  private readonly logger = new Logger(WahaController.name);
  
  private messageBuffer = new Map<string, { texts: string[], mediaUrls: string[], msgIds: Set<string>, timer: NodeJS.Timeout }>();
  private processingQueue: Array<{ sessionName: string, sender: string, combinedText: string, mediaUrls: string[] }> = [];
  private isProcessingQueue = false;
  
  // Queue for CLI Mock output
  private cliOutputQueue: any[] = [];

  constructor(
    private readonly wahaService: WahaService,
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly designFlowService: DesignFlowService,
    private readonly designSessionService: DesignSessionService,
  ) {}

  @Post('instances')
  async createInstance(@Body('name') name: string, @Body('webhookUrl') webhookUrl?: string, @Body('channelAccountId') channelAccountId?: string) {
    try {
      let webhooks: string[] = [];
      
      if (process.env.WEBHOOK_URL) {
         webhooks.push(process.env.WEBHOOK_URL);
      }
      if (webhookUrl && !webhookUrl.includes('localhost') && !webhookUrl.includes('127.0.0.1')) {
         webhooks.push(webhookUrl);
      }
      
      // Selalu masukkan 4 perlindungan ganda ini, tidak peduli apa isi dari .env mentor
      webhooks.push('http://backend:3030/api/v1/waha/webhook');
      webhooks.push('http://iqbal-backend:3030/api/v1/waha/webhook');
      webhooks.push('http://172.17.0.1:3030/api/v1/waha/webhook'); // Docker default gateway
      webhooks.push('http://103.30.195.145:3030/api/v1/waha/webhook');
      
      this.logger.log(`[WAHA] Mendaftarkan total ${webhooks.length} Webhook sekaligus: ${webhooks.join(', ')}`);
      
      return await this.wahaService.startSession(name, webhooks, channelAccountId);
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
       await this.prisma.whatsappInstance.upsert({
         where: { instanceName: sessionName },
         update: {},
         create: { instanceName: sessionName, status: 'WORKING' }
       }).catch(() => null);
    }
    
    if (payload?.event === 'message') {
      const message = payload.payload;
      const sender = message?.from;
      const text = message?.body;
      const mediaUrl = message?.mediaUrl; // Mock CLI image passing
      const timestamp = message?.timestamp ? new Date(message.timestamp * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      this.logger.log(`\n[WAHA PESAN BARU - WHATSAPP] Waktu: ${timestamp} | Dari: ${sender} | Isi: "${text}"\n`);
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
        let text = message.body?.trim();
        
        // Extract quoted message (reply) context if available
        let quotedText = '';
        try {
          if (message.hasQuotedMsg) {
             quotedText = message._data?.quotedMsg?.body || 
                          message._data?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || 
                          message._data?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text || 
                          '';
          }
        } catch (e) {}

        if (quotedText) {
           text = `[Membalas pesan: "${quotedText}"]\n\n${text}`;
        }
        
        const sender = message.from;
        const msgId = message.id?._serialized || message.id || 'unknown';
        const mediaUrl = message.mediaUrl;

          if (text || mediaUrl) {
             const bufferKey = `${sessionName}_${sender}`;
             let buffered = this.messageBuffer.get(bufferKey);
             
             if (!buffered) {
               buffered = { texts: [], mediaUrls: [], msgIds: new Set(), timer: setTimeout(() => {}, 0) };
               this.messageBuffer.set(bufferKey, buffered);
             }
             
             if (!buffered.msgIds.has(msgId)) {
               clearTimeout(buffered.timer);
               if (text) buffered.texts.push(text);
               if (mediaUrl) buffered.mediaUrls.push(mediaUrl);
               buffered.msgIds.add(msgId);
               
               // Debounce: 0ms for CLI testing, 10s for real WAHA
               const debounceMs = sessionName === 'CLI_TEST_SESSION' ? 0 : 10000;
               buffered.timer = setTimeout(() => {
                 const currentBuffer = this.messageBuffer.get(bufferKey);
                 if (currentBuffer) {
                   const combinedText = currentBuffer.texts.join('\n');
                   const mediaUrls = [...currentBuffer.mediaUrls];
                   this.processingQueue.push({ sessionName, sender, combinedText, mediaUrls });
                   this.messageBuffer.delete(bufferKey);
                   
                   this.logger.debug(`[Debounce] Queueing message from ${sender}. Queue length: ${this.processingQueue.length}`);
                   this.processQueue();
                 }
               }, debounceMs);
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

      const { sessionName, sender, combinedText, mediaUrls } = task;

      try {
        const instanceData = await this.prisma.whatsappInstance.findUnique({
          where: { instanceName: sessionName },
          include: { channelAccount: true }
        });
        
        const isMarketingChannel = instanceData?.channelAccount?.name?.toLowerCase().includes('marketing') || sessionName === 'CLI_TEST_SESSION';

        // === 1. Buat WahaBotAdapter (Mock TelegramBot) ===
        const mockBot = {
          sendMessage: async (chatId: string, text: string, options?: any) => {
            this.logger.log(`\n================================`);
            this.logger.log(`[Omnichannel Bridge] Telegram Bot mengirim TEKS ke WAHA:`);
            this.logger.log(text);
            this.logger.log(`================================\n`);
            if (sessionName !== 'CLI_TEST_SESSION') {
              await this.wahaService.sendMessage(sessionName, chatId, text);
            } else {
              this.cliOutputQueue.push({ type: 'text', text: `[Design Bot]: ${text}` });
            }
          },
          sendPhoto: async (chatId: string, photo: Buffer | string, options?: any) => {
            this.logger.log(`\n================================`);
            this.logger.log(`[Omnichannel Bridge] Telegram Bot mengirim GAMBAR ke WAHA.`);
            this.logger.log(`Caption: ${options?.caption || '(Tanpa Caption)'}`);
            this.logger.log(`================================\n`);
            let photoData = photo;
            if (Buffer.isBuffer(photo)) {
              photoData = `data:image/jpeg;base64,${photo.toString('base64')}`;
            }
            if (sessionName !== 'CLI_TEST_SESSION') {
              await this.wahaService.sendImage(sessionName, chatId, photoData as string, options?.caption || '');
            } else {
              const photoDataStr = typeof photoData === 'string' ? photoData : '[Buffer]';
              this.cliOutputQueue.push({ type: 'image', text: `[Design Bot mengirim GAMBAR]\nCaption: ${options?.caption || '(Tanpa Caption)'}\nData/URL: ${photoDataStr.substring(0, 50)}...` });
            }
          },
          getFileLink: async (fileId: string) => {
            // fileId will just be the URL we passed from CLI
            return fileId;
          }
        } as unknown as TelegramBot;

        // If CLI sent mediaUrl, construct Telegram mock photo array
        const mockPhoto = mediaUrls.length > 0 ? [{ file_id: mediaUrls[0] }] : undefined;
        
        const mockMsg = {
          chat: { id: sender },
          text: combinedText,
          photo: mockPhoto
        };

        // === 2. Cek Active Design Session ===
        const activeDesignSession = await this.designSessionService.getSession(sender);
        const hasActiveSession = activeDesignSession && !this.designSessionService.isExpired(activeDesignSession) && activeDesignSession.step !== 'selesai';

        let intent: 'CS' | 'DESIGN' = 'CS';

        /* UNTUK SEMENTARA DESIGN BOT DINONAKTIFKAN
        if (hasActiveSession) {
          intent = 'DESIGN';
        } else {
          // === 3. Intent Routing (Top-Level) ===
          intent = await this.aiService.detectTopLevelIntent(combinedText);
        }
        */

        const overrideIntent: string = 'CS';

        // === 4. Eksekusi Bot Logic Sesuai Intent ===
        if (overrideIntent === 'DESIGN') {
          this.logger.log(`[Omnichannel] Routing ${sender} to DESIGN Bot`);
          if (!hasActiveSession) {
            await this.designSessionService.createSession(sender);
          }
          await this.designFlowService.handle(mockBot, mockMsg);
        } else {
          this.logger.log(`[Omnichannel] Routing ${sender} to CS Bot (Luna)`);
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
          
          // Extract images with new format: [GAMBAR: caption] URL
          const imageTagRegex = /\[GAMBAR:\s*([^\]]+)\]\s*(https?:\/\/[^\s]+)/gi;
          const extractedImages: { url: string, caption: string, rawText: string }[] = [];
          
          let match;
          while ((match = imageTagRegex.exec(aiResponse)) !== null) {
            let url = match[2];
            // Handle gdrive link conversion if needed
            const gdriveMatch = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i.exec(url);
            if (gdriveMatch) {
               url = `https://drive.google.com/uc?export=download&id=${gdriveMatch[1]}`;
            }
            extractedImages.push({ caption: match[1].trim(), url: url, rawText: match[0] });
          }
          
          // Also fallback to the old way just in case AI messes up the format
          const fallbackExtensionRegex = /https?:\/\/[^\s]+\.(?:jpg|jpeg|png|webp|gif)/gi;
          while ((match = fallbackExtensionRegex.exec(aiResponse)) !== null) {
             if (!extractedImages.find(img => img.rawText.includes(match[0]))) {
                extractedImages.push({ caption: 'Gambar Properti Zafy', url: match[0], rawText: match[0] });
             }
          }

          let cleanText = aiResponse;
          for (const img of extractedImages) {
             cleanText = cleanText.replace(img.rawText, '');
          }
          // Remove any leftover "URL:" or numbering that AI might have generated
          cleanText = cleanText.replace(/URL:\s*/gi, '');
          // Remove leftover list artifacts like "1. Zafi Residence:" on a single line
          cleanText = cleanText.replace(/^\s*\d+\.\s*[^:\n]+:?\s*$/gm, '');
          // Remove excessive newlines caused by stripping tags
          cleanText = cleanText.replace(/\n{3,}/g, '\n\n').trim();

          if (extractedImages.length > 0) {
             this.logger.log(`\n================================`);
             this.logger.log(`[Omnichannel Bridge] CS Bot mengirim ${extractedImages.length} GAMBAR ke WAHA.`);
             this.logger.log(`================================\n`);

             if (sessionName !== 'CLI_TEST_SESSION') {
                // If there is still actual text left after stripping images, send it as text FIRST
                if (cleanText.length > 5) {
                   await this.wahaService.sendMessage(sessionName, sender, cleanText);
                }
                
                // Then send all images with their respective captions
                for (const img of extractedImages) {
                   await this.wahaService.sendImage(sessionName, sender, img.url, img.caption);
                }
             } else {
                if (cleanText.length > 5) {
                   this.cliOutputQueue.push({ type: 'text', text: `[Zafi Property]: ${cleanText}` });
                }
                for (const img of extractedImages) {
                   this.cliOutputQueue.push({ type: 'image', text: `[Zafi Property mengirim GAMBAR]\nCaption: ${img.caption}\nURL: ${img.url}` });
                }
             }
          } else {
             this.logger.log(`\n================================`);
             this.logger.log(`[Omnichannel Bridge] CS Bot mengirim TEKS ke WAHA:`);
             this.logger.log(cleanText);
             this.logger.log(`================================\n`);

             if (sessionName !== 'CLI_TEST_SESSION') {
               await this.wahaService.sendMessage(sessionName, sender, cleanText);
             } else {
               this.cliOutputQueue.push({ type: 'text', text: `[Zafy Property]: ${cleanText}` });
             }
          }
        }
      } catch (error) {
        this.logger.error(`Failed to process queue task for ${sender}: ${error.message}`);
      }
    }

    this.isProcessingQueue = false;
  }
}
