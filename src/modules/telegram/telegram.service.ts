import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
const sharp = require('sharp');

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot | null = null;
  private readonly INSTANCE_NAME = 'telegram-dev-bot';
  
  private messageBuffer = new Map<string, { texts: string[], msgIds: Set<string>, timer: NodeJS.Timeout }>();
  private processingQueue: Array<{ sender: string, combinedText: string }> = [];
  private isProcessingQueue = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN is not defined in .env. Telegram dev bot will not start.');
      return;
    }

    try {
      this.bot = new TelegramBot(token, { polling: true });
      this.logger.log('Telegram Bot initialized for development with polling.');

      // Ensure mock instance exists in DB so UI can see it
      await this.ensureMockInstance();

      this.bot.on('message', async (msg) => {
        await this.handleIncomingMessage(msg);
      });

    } catch (e) {
      this.logger.error(`Failed to initialize Telegram Bot: ${e.message}`);
    }
  }

  private async ensureMockInstance() {
    // Create a mock channel account for telegram if not exist
    let channel = await this.prisma.channelAccount.findFirst({
      where: { name: 'Telegram Development' }
    });
    
    if (!channel) {
      channel = await this.prisma.channelAccount.create({
        data: {
          name: 'Telegram Development',
          platform: 'TELEGRAM',
          isActive: true
        }
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

  private async handleIncomingMessage(msg: any) {
    if (!msg.text) return; // Only process text messages for now

    const chatId = msg.chat.id.toString();
    const senderName = msg.from?.first_name || 'Telegram User';
    const text = msg.text;
    const msgId = msg.message_id.toString();

    this.logger.log(`\n[TELEGRAM PESAN BARU] Dari: ${chatId} (${senderName}) | Isi: "${text}"\n`);

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
      this.logger.warn(`Failed to save Telegram message to DB: ${e.message}`);
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

        this.bot?.sendChatAction(sender, 'typing');
        const aiResponse = await this.aiService.generateLunaResponse(combinedText, sender, chatHistory);
        
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

        // Clean up empty bullet points left behind (e.g. "- Layout Denah: ")
        cleanText = cleanText.replace(/^\s*-\s*.*?:\s*$/gm, '').trim();
        // Clean up excessive newlines left behind
        cleanText = cleanText.replace(/\n{3,}/g, '\n\n');

        this.logger.debug(`[TELEGRAM AI RESPONSE] ${cleanText}`);
        
        let sentTextAsCaption = false;

        // Send to Telegram
        if (extractedImages.length > 0) {
          for (let i = 0; i < extractedImages.length; i++) {
            const imgUrl = extractedImages[i];
            try {
              let photoData: any = imgUrl;

              // Check if it's a Google Drive link
              const gdriveMatch = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i.exec(imgUrl);
              if (gdriveMatch) {
                const fileId = gdriveMatch[1];
                // Use uc?export=download to bypass HTML viewer
                const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                const response = await axios.get(directUrl, { responseType: 'arraybuffer' });
                let buffer = Buffer.from(response.data);
                
                // Compress if larger than 5MB
                if (buffer.length > 5 * 1024 * 1024) {
                   buffer = await sharp(buffer)
                     .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
                     .jpeg({ quality: 80 })
                     .toBuffer();
                }
                photoData = buffer;
              }

              const options: any = {};
              
              // Add caption to the first image if text fits
              if (i === 0 && cleanText && cleanText.length <= 1024) {
                options.caption = cleanText;
                sentTextAsCaption = true;
              }

              await this.bot?.sendPhoto(sender, photoData, options).catch(e => this.logger.warn(`Telegram failed to send photo: ${e.message}`));
            } catch (e) {
              this.logger.warn(`Failed to process or send image ${imgUrl}: ${e.message}`);
            }
          }
        }
        
        if (cleanText) {
          if (!sentTextAsCaption) {
            const sentMsg = await this.bot?.sendMessage(sender, cleanText);
            
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
             // If sent as caption, we still record the text in the DB for the dashboard
             if (conversation) {
               await this.prisma.message.create({
                  data: {
                    wahaMessageId: Date.now().toString(), // Mock ID since caption message_id is shared with photo
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
        await this.bot?.sendMessage(sender, 'Maaf, sistem AI sedang mengalami gangguan. Mohon coba beberapa saat lagi.');
      }
    }

    this.isProcessingQueue = false;
  }
}
