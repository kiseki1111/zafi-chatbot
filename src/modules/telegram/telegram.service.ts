import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ConfigService } from '@nestjs/config';
import { OnboardingService } from '../onboarding/onboarding.service';
import { OnboardingState } from '../onboarding/onboarding-states';
import axios from 'axios';
const sharp = require('sharp');

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private csBot: TelegramBot | null = null;
  private onboardingBot: TelegramBot | null = null;
  private readonly INSTANCE_NAME = 'telegram-dev-bot';
  
  private messageBuffer = new Map<string, { texts: string[], msgIds: Set<string>, timer: NodeJS.Timeout }>();
  private processingQueue: Array<{ sender: string, combinedText: string }> = [];
  private isProcessingQueue = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
    private readonly onboardingService: OnboardingService,
  ) {}

  async onModuleInit() {
    const csToken = this.configService.get<string>('TELEGRAM_BOT_CS_API');
    const onboardingToken = this.configService.get<string>('TELEGRAM_BOT_ONBOARDING_API');

    if (!csToken || !onboardingToken) {
      this.logger.warn('TELEGRAM_BOT_CS_API or TELEGRAM_BOT_ONBOARDING_API is not defined. Bots might not start.');
    }

    try {
      // Ensure mock instance exists in DB so UI can see it
      await this.ensureMockInstance();

      if (csToken) {
        this.csBot = new TelegramBot(csToken, { polling: true });
        this.logger.log('CS Telegram Bot initialized.');
        
        this.csBot.on('message', async (msg) => {
          await this.handleCSMessage(msg);
        });
      }

      if (onboardingToken) {
        this.onboardingBot = new TelegramBot(onboardingToken, { polling: true });
        this.logger.log('Onboarding Telegram Bot initialized.');
        
        this.onboardingBot.on('message', async (msg) => {
          await this.handleOnboardingMessage(msg);
        });
      }

    } catch (e) {
      this.logger.error(`Failed to initialize Telegram Bots: ${e.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.csBot) {
      await this.csBot.stopPolling();
      this.logger.log('CS Telegram Bot polling stopped.');
    }
    if (this.onboardingBot) {
      await this.onboardingBot.stopPolling();
      this.logger.log('Onboarding Telegram Bot polling stopped.');
    }
  }

  private async ensureMockInstance() {
    let channel = await this.prisma.channelAccount.findFirst({
      where: { name: 'Telegram Development' }
    });
    
    if (!channel) {
      channel = await this.prisma.channelAccount.create({
        data: { name: 'Telegram Development', platform: 'TELEGRAM', isActive: true }
      });
    }

    await this.prisma.whatsappInstance.upsert({
      where: { instanceName: this.INSTANCE_NAME },
      update: { status: 'WORKING', channelAccountId: channel.id, provider: 'TELEGRAM' },
      create: {
        instanceName: this.INSTANCE_NAME,
        provider: 'TELEGRAM',
        status: 'WORKING',
        channelAccountId: channel.id,
        phone: 'TELEGRAM_BOT'
      }
    });
  }

  private async handleOnboardingMessage(msg: any) {
    if (!msg.text) return;

    const chatId = msg.chat.id.toString();
    const senderName = msg.from?.first_name || 'Telegram User';
    const text = msg.text;

    this.logger.log(`\n[ONBOARDING BOT] Dari: ${chatId} (${senderName}) | Isi: "${text}"\n`);

    if (text.startsWith('/reset')) {
      const existingSession = await this.prisma.onboardingSession.findUnique({ where: { chatId } });
      if (existingSession) {
        await this.prisma.onboardingSession.delete({ where: { chatId } });
        if (existingSession.tenantId) {
          await this.prisma.tenant.delete({ where: { id: existingSession.tenantId } }).catch(() => {});
        }
      }
      await this.onboardingBot?.sendMessage(chatId, 'Data onboarding Anda telah direset. Silakan ketik /onboarding untuk memulai dari awal.');
      return;
    }

    if (text.startsWith('/onboarding') || text.startsWith('/start')) {
      const existingSession = await this.prisma.onboardingSession.findUnique({ where: { chatId } });
      if (existingSession && existingSession.state === OnboardingState.COMPLETED) {
        await this.onboardingBot?.sendMessage(chatId, 'Toko Anda sudah selesai di-onboard. Jika ingin mengulang dari awal, ketik /reset.');
        return;
      }
      
      const session = await this.prisma.onboardingSession.upsert({
        where: { chatId },
        update: { state: OnboardingState.IN_PROGRESS, data: {} },
        create: { chatId, state: OnboardingState.IN_PROGRESS, platform: 'TELEGRAM' }
      });

      await this.onboardingService.handleMessage(chatId, 'Halo, saya ingin mendaftarkan toko saya dari awal.', session, async (cid, t) => {
        await this.onboardingBot?.sendMessage(cid, t);
      });
      return;
    }

    const session = await this.prisma.onboardingSession.findUnique({ where: { chatId } });
    if (session && session.state !== OnboardingState.COMPLETED) {
      await this.onboardingService.handleMessage(chatId, text, session, async (cid, t) => {
        await this.onboardingBot?.sendMessage(cid, t);
      });
    } else {
      await this.onboardingBot?.sendMessage(chatId, 'Silakan ketik /onboarding untuk mendaftar.');
    }
  }

  private async handleCSMessage(msg: any) {
    if (!msg.text) return;

    const chatId = msg.chat.id.toString();
    const senderName = msg.from?.first_name || 'Customer';
    const text = msg.text;
    const msgId = msg.message_id.toString();

    this.logger.log(`\n[CS BOT] Dari: ${chatId} (${senderName}) | Isi: "${text}"\n`);

    try {
      // 1. Upsert Contact
      const contact = await this.prisma.contact.upsert({
        where: { phone: chatId },
        update: { name: senderName },
        create: { phone: chatId, name: senderName }
      });

      // 2. Upsert Conversation
      const conversation = await this.prisma.conversation.upsert({
        where: {
          instanceName_contactId: { instanceName: this.INSTANCE_NAME, contactId: contact.id }
        },
        update: {
          lastMessageAt: new Date(msg.date * 1000),
          unreadCount: { increment: 1 }
        },
        create: {
          instanceName: this.INSTANCE_NAME,
          contactId: contact.id,
          unreadCount: 1,
        }
      });

      // 3. Create Message
      await this.prisma.message.upsert({
        where: { wahaMessageId: msgId },
        update: {},
        create: {
          wahaMessageId: msgId,
          conversationId: conversation.id,
          senderType: 'customer',
          messageType: 'text',
          content: text,
          status: 'RECEIVED',
          metadata: msg
        }
      });
    } catch (e) {
      this.logger.warn(`Failed to save CS message to DB: ${e.message}`);
    }

    // Buffer logic (10s debounce)
    const bufferKey = chatId;

    const existing = this.messageBuffer.get(bufferKey);
    if (existing) {
      if (!existing.msgIds.has(msgId)) {
        clearTimeout(existing.timer);
        existing.texts.push(text);
        existing.msgIds.add(msgId);
        
        existing.timer = setTimeout(() => {
          const buffered = this.messageBuffer.get(bufferKey);
          if (buffered) {
            const combinedText = buffered.texts.join('\n');
            this.processingQueue.push({ sender: chatId, combinedText });
            this.messageBuffer.delete(bufferKey);
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
            this.processingQueue.push({ sender: chatId, combinedText });
            this.messageBuffer.delete(bufferKey);
            this.processQueue();
          }
        }, 10000)
      });
    }
  }

  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.processingQueue.length > 0) {
      const task = this.processingQueue.shift();
      if (!task) continue;

      const { sender, combinedText } = task;

      try {
        const contact = await this.prisma.contact.findUnique({ where: { phone: sender } });
        const conversation = contact ? await this.prisma.conversation.findUnique({
          where: { instanceName_contactId: { instanceName: this.INSTANCE_NAME, contactId: contact.id } }
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

        // For dev CS Bot, we just use the first tenant we can find
        const firstTenant = await this.prisma.tenant.findFirst();
        const tenantId = firstTenant?.id;

        this.csBot?.sendChatAction(sender, 'typing');
        const aiResponse = await this.aiService.generateLunaResponse(combinedText, sender, chatHistory, tenantId);
        
        // Extract images
        const gdriveRegex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)(?:\/[^\s]*)?/gi;
        const genericHostRegex = /https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:ibb\.co\.com|ibb\.co|postimg\.cc|postimages\.org)[^\s]*/gi;
        const extensionRegex = /https?:\/\/[^\s]+\.(?:jpg|jpeg|png|webp|gif)/gi;
        
        const extractedImages: string[] = [];
        let cleanText = aiResponse;

        [gdriveRegex, genericHostRegex, extensionRegex].forEach(regex => {
          let match;
          while ((match = regex.exec(aiResponse)) !== null) {
            extractedImages.push(match[0]);
            cleanText = cleanText.replace(match[0], '').trim();
          }
        });

        cleanText = cleanText.replace(/^\s*-\s*.*?:\s*$/gm, '').trim();
        cleanText = cleanText.replace(/\n{3,}/g, '\n\n');

        this.logger.debug(`[CS BOT RESPONSE] ${cleanText}`);
        
        let sentTextAsCaption = false;

        if (extractedImages.length > 0) {
          for (let i = 0; i < extractedImages.length; i++) {
            const imgUrl = extractedImages[i];
            try {
              let photoData: any = imgUrl;
              const gdriveMatch = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i.exec(imgUrl);
              if (gdriveMatch) {
                const fileId = gdriveMatch[1];
                const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                const response = await axios.get(directUrl, { responseType: 'arraybuffer' });
                let buffer = Buffer.from(response.data);
                
                if (buffer.length > 5 * 1024 * 1024) {
                   buffer = await sharp(buffer)
                     .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
                     .jpeg({ quality: 80 })
                     .toBuffer();
                }
                photoData = buffer;
              }

              const options: any = {};
              if (i === 0 && cleanText && cleanText.length <= 1024) {
                options.caption = cleanText;
                sentTextAsCaption = true;
              }

              await this.csBot?.sendPhoto(sender, photoData, options).catch(e => this.logger.warn(`Telegram failed to send photo: ${e.message}`));
            } catch (e) {
              this.logger.warn(`Failed to process or send image ${imgUrl}: ${e.message}`);
            }
          }
        }
        
        if (cleanText) {
          if (!sentTextAsCaption) {
            const sentMsg = await this.csBot?.sendMessage(sender, cleanText);
            
            if (sentMsg && conversation) {
              await this.prisma.message.create({
                data: {
                  wahaMessageId: sentMsg.message_id.toString(),
                  conversationId: conversation.id,
                  senderType: 'bot',
                  messageType: 'text',
                  content: cleanText,
                  status: 'SENT',
                  metadata: sentMsg
                }
              });
            }
          } else {
             if (conversation) {
               await this.prisma.message.create({
                  data: {
                    wahaMessageId: Date.now().toString(),
                    conversationId: conversation.id,
                    senderType: 'bot',
                    messageType: 'text',
                    content: cleanText,
                    status: 'SENT',
                    metadata: { type: 'caption' }
                  }
               });
             }
          }
        }
      } catch (error) {
        this.logger.error(`Error processing AI for Telegram: ${error.message}`);
        await this.csBot?.sendMessage(sender, 'Maaf, sistem AI sedang mengalami gangguan. Mohon coba beberapa saat lagi.');
      }
    }

    this.isProcessingQueue = false;
  }
}
