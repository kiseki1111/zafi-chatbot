"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var TelegramService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
const common_1 = require("@nestjs/common");
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
const config_1 = require("@nestjs/config");
const onboarding_service_1 = require("../onboarding/onboarding.service");
const onboarding_states_1 = require("../onboarding/onboarding-states");
const design_flow_service_1 = require("./design/design-flow.service");
const axios_1 = __importDefault(require("axios"));
const sharp = require('sharp');
let TelegramService = TelegramService_1 = class TelegramService {
    prisma;
    aiService;
    configService;
    onboardingService;
    designFlowService;
    logger = new common_1.Logger(TelegramService_1.name);
    csBot = null;
    onboardingBot = null;
    designBot = null;
    INSTANCE_NAME = 'telegram-dev-bot';
    messageBuffer = new Map();
    processingQueue = [];
    isProcessingQueue = false;
    designUserBuffers = new Map();
    designUserTimers = new Map();
    DESIGN_DEBOUNCE_MS = 5000;
    constructor(prisma, aiService, configService, onboardingService, designFlowService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.configService = configService;
        this.onboardingService = onboardingService;
        this.designFlowService = designFlowService;
    }
    async onModuleInit() {
        const csToken = this.configService.get('TELEGRAM_BOT_CS_API');
        const onboardingToken = this.configService.get('TELEGRAM_BOT_ONBOARDING_API');
        if (!csToken || !onboardingToken) {
            this.logger.warn('TELEGRAM_BOT_CS_API or TELEGRAM_BOT_ONBOARDING_API is not defined. Bots might not start.');
        }
        try {
            await this.ensureMockInstance();
            if (csToken) {
                this.csBot = new node_telegram_bot_api_1.default(csToken, { polling: true });
                this.logger.log('CS Telegram Bot initialized.');
                this.csBot.on('message', async (msg) => {
                    await this.handleCSMessage(msg);
                });
            }
            if (onboardingToken) {
                this.onboardingBot = new node_telegram_bot_api_1.default(onboardingToken, { polling: true });
                this.logger.log('Onboarding Telegram Bot initialized.');
                this.onboardingBot.on('message', async (msg) => {
                    await this.handleOnboardingMessage(msg);
                });
            }
            const designToken = this.configService.get('TELEGRAM_BOT_DESIGN_API');
            if (designToken) {
                this.designBot = new node_telegram_bot_api_1.default(designToken, { polling: true });
                this.logger.log('Design Telegram Bot initialized.');
                this.designBot.on('message', async (msg) => {
                    await this.handleDesignMessage(msg);
                });
                this.designBot.on('polling_error', (err) => {
                    this.logger.error(`Design bot polling error: ${err.message}`);
                });
            }
            else {
                this.logger.warn('TELEGRAM_BOT_DESIGN_API not set. Design Bot will not start.');
            }
        }
        catch (e) {
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
        if (this.designBot) {
            await this.designBot.stopPolling();
            this.logger.log('Design Telegram Bot polling stopped.');
        }
    }
    async ensureMockInstance() {
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
    async handleOnboardingMessage(msg) {
        if (!msg.text)
            return;
        const chatId = msg.chat.id.toString();
        const senderName = msg.from?.first_name || 'Telegram User';
        const text = msg.text;
        this.logger.log(`\n[ONBOARDING BOT] Dari: ${chatId} (${senderName}) | Isi: "${text}"\n`);
        if (text.startsWith('/reset')) {
            const existingSession = await this.prisma.onboardingSession.findUnique({ where: { chatId } });
            if (existingSession) {
                await this.prisma.onboardingSession.delete({ where: { chatId } });
                if (existingSession.tenantId) {
                    await this.prisma.tenant.delete({ where: { id: existingSession.tenantId } }).catch(() => { });
                }
            }
            await this.onboardingBot?.sendMessage(chatId, 'Data onboarding Anda telah direset. Silakan ketik /onboarding untuk memulai dari awal.');
            return;
        }
        if (text.startsWith('/onboarding') || text.startsWith('/start')) {
            const existingSession = await this.prisma.onboardingSession.findUnique({ where: { chatId } });
            if (existingSession && existingSession.state === onboarding_states_1.OnboardingState.COMPLETED) {
                await this.onboardingBot?.sendMessage(chatId, 'Toko Anda sudah selesai di-onboard. Jika ingin mengulang dari awal, ketik /reset.');
                return;
            }
            const session = await this.prisma.onboardingSession.upsert({
                where: { chatId },
                update: { state: onboarding_states_1.OnboardingState.IN_PROGRESS, data: {} },
                create: { chatId, state: onboarding_states_1.OnboardingState.IN_PROGRESS, platform: 'TELEGRAM' }
            });
            await this.onboardingService.handleMessage(chatId, 'Halo, saya ingin mendaftarkan toko saya dari awal.', session, async (cid, t) => {
                await this.onboardingBot?.sendMessage(cid, t);
            });
            return;
        }
        const session = await this.prisma.onboardingSession.findUnique({ where: { chatId } });
        if (session && session.state !== onboarding_states_1.OnboardingState.COMPLETED) {
            await this.onboardingService.handleMessage(chatId, text, session, async (cid, t) => {
                await this.onboardingBot?.sendMessage(cid, t);
            });
        }
        else {
            await this.onboardingBot?.sendMessage(chatId, 'Silakan ketik /onboarding untuk mendaftar.');
        }
    }
    async handleDesignMessage(msg) {
        const userId = msg.chat.id;
        const text = msg.text?.trim();
        const photo = msg.photo;
        if (!text && !photo)
            return;
        if (text === '/start' || text === '/baru' || photo) {
            if (this.designUserTimers.has(userId)) {
                clearTimeout(this.designUserTimers.get(userId));
                this.designUserTimers.delete(userId);
            }
            this.designUserBuffers.delete(userId);
            try {
                await this.designFlowService.handle(this.designBot, msg);
            }
            catch (err) {
                this.logger.error(`Design flow error: ${err.message}`);
                await this.designBot?.sendMessage(userId, '❌ Terjadi kesalahan. Coba ketik /start untuk mulai ulang.');
            }
            return;
        }
        const currentBuffer = this.designUserBuffers.get(userId) || [];
        currentBuffer.push(text);
        this.designUserBuffers.set(userId, currentBuffer);
        if (this.designUserTimers.has(userId)) {
            clearTimeout(this.designUserTimers.get(userId));
        }
        const timer = setTimeout(async () => {
            const texts = this.designUserBuffers.get(userId) || [];
            if (texts.length === 0)
                return;
            const combinedText = texts.join('\n');
            this.designUserBuffers.delete(userId);
            this.designUserTimers.delete(userId);
            const combinedMsg = { ...msg, text: combinedText, photo: undefined };
            try {
                await this.designFlowService.handle(this.designBot, combinedMsg);
            }
            catch (err) {
                this.logger.error(`Design flow error: ${err.message}`);
                await this.designBot?.sendMessage(userId, '❌ Terjadi kesalahan. Coba ketik /start untuk mulai ulang.');
            }
        }, this.DESIGN_DEBOUNCE_MS);
        this.designUserTimers.set(userId, timer);
    }
    async handleCSMessage(msg) {
        if (!msg.text)
            return;
        const chatId = msg.chat.id.toString();
        const senderName = msg.from?.first_name || 'Customer';
        const text = msg.text;
        const msgId = msg.message_id.toString();
        this.logger.log(`\n[CS BOT] Dari: ${chatId} (${senderName}) | Isi: "${text}"\n`);
        try {
            const contact = await this.prisma.contact.upsert({
                where: { phone: chatId },
                update: { name: senderName },
                create: { phone: chatId, name: senderName }
            });
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
        }
        catch (e) {
            this.logger.warn(`Failed to save CS message to DB: ${e.message}`);
        }
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
        }
        else {
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
    async processQueue() {
        if (this.isProcessingQueue)
            return;
        this.isProcessingQueue = true;
        while (this.processingQueue.length > 0) {
            const task = this.processingQueue.shift();
            if (!task)
                continue;
            const { sender, combinedText } = task;
            try {
                const contact = await this.prisma.contact.findUnique({ where: { phone: sender } });
                const conversation = contact ? await this.prisma.conversation.findUnique({
                    where: { instanceName_contactId: { instanceName: this.INSTANCE_NAME, contactId: contact.id } }
                }) : null;
                this.logger.log(`[CS PIPELINE] Step 1: Contact=${contact?.id || 'N/A'}, Conversation=${conversation?.id || 'N/A'}`);
                let chatHistory = [];
                if (conversation) {
                    chatHistory = await this.prisma.message.findMany({
                        where: { conversationId: conversation.id },
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    });
                    chatHistory.reverse();
                    const beforeCount = chatHistory.length;
                    chatHistory = chatHistory.filter(msg => {
                        if (msg.senderType === 'bot' && msg.content && msg.content.includes('example.com')) {
                            return false;
                        }
                        return true;
                    });
                    if (chatHistory.length < beforeCount) {
                        this.logger.warn(`[CS PIPELINE] Removed ${beforeCount - chatHistory.length} poisoned history messages containing example.com`);
                    }
                }
                this.logger.log(`[CS PIPELINE] Step 2: Chat history loaded (${chatHistory.length} messages)`);
                const firstTenant = await this.prisma.tenant.findFirst();
                const tenantId = firstTenant?.id;
                this.logger.log(`[CS PIPELINE] Step 3: Tenant=${firstTenant?.name || 'N/A'} (${tenantId || 'N/A'})`);
                this.csBot?.sendChatAction(sender, 'typing');
                this.logger.log(`[CS PIPELINE] Step 4: Calling AI with message="${combinedText.substring(0, 80)}..."`);
                const aiResponse = await this.aiService.generateLunaResponse(combinedText, sender, chatHistory, tenantId);
                this.logger.log(`[CS PIPELINE] Step 5: RAW AI Response (first 300 chars):\n${aiResponse.substring(0, 300)}`);
                const gdriveRegex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)(?:\/[^\s)\]]*)?/gi;
                const genericHostRegex = /https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:ibb\.co\.com|ibb\.co|postimg\.cc|postimages\.org)[^\s)\]]*/gi;
                const supabaseRegex = /https?:\/\/[a-zA-Z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/[^\s)\]]+/gi;
                const extractedImages = [];
                let cleanText = aiResponse;
                [gdriveRegex, genericHostRegex, supabaseRegex].forEach(regex => {
                    let match;
                    while ((match = regex.exec(aiResponse)) !== null) {
                        if (!extractedImages.includes(match[0])) {
                            extractedImages.push(match[0]);
                        }
                        cleanText = cleanText.replace(match[0], '').trim();
                    }
                });
                const extensionRegex = /https?:\/\/[^\s)\]]+\.(?:jpg|jpeg|png|webp|gif)/gi;
                let extMatch;
                while ((extMatch = extensionRegex.exec(aiResponse)) !== null) {
                    const url = extMatch[0];
                    if (url.includes('example.com'))
                        continue;
                    if (!extractedImages.includes(url)) {
                        extractedImages.push(url);
                    }
                    cleanText = cleanText.replace(url, '').trim();
                }
                cleanText = cleanText.replace(/\[Link Gambar\]\([^)]*\)/gi, '');
                cleanText = cleanText.replace(/\[Link[^\]]*\]\([^)]*\)/gi, '');
                cleanText = cleanText.replace(/^\s*-\s*.*?:\s*$/gm, '').trim();
                cleanText = cleanText.replace(/\n{3,}/g, '\n\n');
                this.logger.log(`[CS PIPELINE] Step 6: Extracted ${extractedImages.length} image(s): ${JSON.stringify(extractedImages)}`);
                this.logger.log(`[CS PIPELINE] Step 7: Clean text (first 200 chars): ${cleanText.substring(0, 200)}`);
                let sentTextAsCaption = false;
                if (extractedImages.length > 0) {
                    for (let i = 0; i < extractedImages.length; i++) {
                        const imgUrl = extractedImages[i];
                        this.logger.log(`[CS PIPELINE] Step 8.${i}: Processing image: ${imgUrl}`);
                        try {
                            let photoData = imgUrl;
                            const gdriveMatch = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i.exec(imgUrl);
                            const isSupabase = imgUrl.includes('.supabase.co/storage');
                            if (gdriveMatch || isSupabase) {
                                let downloadUrl = imgUrl;
                                if (gdriveMatch) {
                                    const fileId = gdriveMatch[1];
                                    downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                                }
                                this.logger.log(`[CS PIPELINE] Downloading from: ${downloadUrl}`);
                                const response = await axios_1.default.get(downloadUrl, { responseType: 'arraybuffer', timeout: 15000 });
                                let buffer = Buffer.from(response.data);
                                this.logger.log(`[CS PIPELINE] Downloaded: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
                                buffer = await sharp(buffer)
                                    .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
                                    .jpeg({ quality: 70 })
                                    .toBuffer();
                                this.logger.log(`[CS PIPELINE] Compressed to: ${(buffer.length / 1024).toFixed(0)} KB`);
                                photoData = buffer;
                            }
                            const options = {};
                            if (i === 0 && cleanText && cleanText.length <= 1024) {
                                options.caption = cleanText;
                                sentTextAsCaption = true;
                            }
                            await this.csBot?.sendPhoto(sender, photoData, options);
                            this.logger.log(`[CS PIPELINE] Step 9.${i}: Photo sent to Telegram successfully!`);
                        }
                        catch (e) {
                            this.logger.error(`[CS PIPELINE] FAILED to send image ${imgUrl}: ${e.message}`);
                        }
                    }
                }
                else {
                    this.logger.warn(`[CS PIPELINE] No images extracted from AI response!`);
                }
                if (cleanText) {
                    if (!sentTextAsCaption) {
                        const sentMsg = await this.csBot?.sendMessage(sender, cleanText);
                        this.logger.log(`[CS PIPELINE] Step 10: Text message sent.`);
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
                    }
                    else {
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
            }
            catch (error) {
                this.logger.error(`Error processing AI for Telegram: ${error.message}`);
                await this.csBot?.sendMessage(sender, 'Maaf, sistem AI sedang mengalami gangguan. Mohon coba beberapa saat lagi.');
            }
        }
        this.isProcessingQueue = false;
    }
};
exports.TelegramService = TelegramService;
exports.TelegramService = TelegramService = TelegramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService,
        config_1.ConfigService,
        onboarding_service_1.OnboardingService,
        design_flow_service_1.DesignFlowService])
], TelegramService);
//# sourceMappingURL=telegram.service.js.map