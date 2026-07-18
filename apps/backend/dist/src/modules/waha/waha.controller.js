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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WahaController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WahaController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const waha_service_1 = require("./waha.service");
const prisma_service_1 = require("../../infrastructure/prisma/prisma.service");
const ai_service_1 = require("../ai/ai.service");
const design_flow_service_1 = require("../telegram/design/design-flow.service");
const design_session_service_1 = require("../telegram/design/design-session.service");
let WahaController = WahaController_1 = class WahaController {
    wahaService;
    prisma;
    aiService;
    designFlowService;
    designSessionService;
    logger = new common_1.Logger(WahaController_1.name);
    messageBuffer = new Map();
    processingQueue = [];
    isProcessingQueue = false;
    cliOutputQueue = [];
    constructor(wahaService, prisma, aiService, designFlowService, designSessionService) {
        this.wahaService = wahaService;
        this.prisma = prisma;
        this.aiService = aiService;
        this.designFlowService = designFlowService;
        this.designSessionService = designSessionService;
    }
    async createInstance(name, webhookUrl, channelAccountId) {
        try {
            const finalWebhookUrl = process.env.WEBHOOK_URL || webhookUrl;
            return await this.wahaService.startSession(name, finalWebhookUrl, channelAccountId);
        }
        catch (error) {
            if (error.response?.status === 422) {
                this.logger.warn(`Session ${name} already exists or is invalid.`);
                return { message: 'Session already running or invalid state. Ignoring start command.', status: 'ignored' };
            }
            throw error;
        }
    }
    async stopInstance(id) {
        return this.wahaService.stopSession(id);
    }
    async logoutInstance(id) {
        return this.wahaService.logoutSession(id);
    }
    async deleteInstance(id) {
        try {
            await this.wahaService.logoutSession(id);
        }
        catch (e) {
            this.logger.warn(`Failed to logout session ${id} from WAHA, ignoring: ${e.message}`);
        }
        await this.prisma.whatsappInstance.delete({ where: { instanceName: id } }).catch(() => null);
        return { success: true };
    }
    async getInstances() {
        return this.wahaService.getSessions();
    }
    async getQrCode(id, res) {
        try {
            const qrBuffer = await this.wahaService.getQrCode(id);
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Content-Disposition', `inline; filename="qr-${id}.png"`);
            return res.send(Buffer.from(qrBuffer));
        }
        catch (error) {
            this.logger.error(`Failed to get QR code for ${id}: ${error.message}`);
            return res.status(error.response?.status || 500).send({
                error: error.message
            });
        }
    }
    async sendMessage(id, body) {
        const contact = await this.prisma.contact.upsert({
            where: { phone: body.chatId },
            update: {},
            create: { name: body.chatId, phone: body.chatId }
        });
        const conversation = await this.prisma.conversation.upsert({
            where: { instanceName_contactId: { instanceName: id, contactId: contact.id } },
            update: { lastMessageAt: new Date() },
            create: { instanceName: id, contactId: contact.id, unreadCount: 0 }
        });
        const dbMsg = await this.prisma.message.create({
            data: {
                conversationId: conversation.id,
                senderType: 'agent',
                messageType: 'text',
                content: body.text,
                status: 'PENDING',
            }
        });
        this.wahaService.sendMessage(id, body.chatId, body.text).then(async (result) => {
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
    async getLogs(id) {
        return this.prisma.webhookLog.findMany({
            where: { instanceName: id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
    }
    async cliPoll() {
        const messages = [...this.cliOutputQueue];
        this.cliOutputQueue = [];
        return messages;
    }
    async handleWebhook(payload) {
        if (!payload)
            return { status: 'ignored' };
        const sessionName = payload.session || 'unknown';
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
            const mediaUrl = message?.mediaUrl;
            const timestamp = message?.timestamp ? new Date(message.timestamp * 1000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
            this.logger.log(`\n[WAHA PESAN BARU] Waktu: ${timestamp} | Dari: ${sender} | Isi: "${text}"\n`);
        }
        else {
            this.logger.log(`Received WAHA webhook event: ${payload?.event}`);
        }
        if (payload?.session && payload?.event) {
            await this.prisma.webhookLog.create({
                data: {
                    instanceName: payload.session,
                    event: payload.event,
                    payload: payload
                }
            }).catch(e => this.logger.warn(`Failed to create webhookLog for ${payload.session}: ${e.message}`));
        }
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
                    }
                    else {
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
                }
                catch (e) {
                    if (e.code === 'P2002') {
                        this.logger.debug(`Concurrent webhook for ${contactNumber}, ignoring unique constraint.`);
                    }
                    else {
                        this.logger.warn(`Failed to save message to DB: ${e.message}`);
                    }
                }
            }
            if ((payload.event === 'message' || payload.event === 'message.any') && !message.fromMe) {
                let text = message.body?.trim();
                let quotedText = '';
                try {
                    if (message.hasQuotedMsg) {
                        quotedText = message._data?.quotedMsg?.body ||
                            message._data?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                            message._data?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
                            '';
                    }
                }
                catch (e) { }
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
                        buffered = { texts: [], mediaUrls: [], msgIds: new Set(), timer: setTimeout(() => { }, 0) };
                        this.messageBuffer.set(bufferKey, buffered);
                    }
                    if (!buffered.msgIds.has(msgId)) {
                        clearTimeout(buffered.timer);
                        if (text)
                            buffered.texts.push(text);
                        if (mediaUrl)
                            buffered.mediaUrls.push(mediaUrl);
                        buffered.msgIds.add(msgId);
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
        }
        else if (payload?.event === 'message.ack') {
            const ack = payload.payload;
            const msgId = ack.id?._serialized || ack.id;
            const statuses = ['ERROR', 'PENDING', 'SENT', 'DELIVERED', 'READ', 'PLAYED'];
            const statusStr = statuses[ack.ack + 1] || 'UNKNOWN';
            if (msgId) {
                await this.prisma.message.updateMany({
                    where: { wahaMessageId: msgId },
                    data: { status: statusStr }
                }).catch(e => this.logger.warn(`Failed to update ACK: ${e.message}`));
            }
        }
        else if (payload?.event === 'session.status') {
            const sessionName = payload.session;
            const status = payload.payload?.status;
            if (sessionName && status) {
                let updateData = { status: status };
                if (status === 'STOPPED') {
                    updateData.lastConnectedAt = null;
                }
                else if (status === 'WORKING') {
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
    async processQueue() {
        if (this.isProcessingQueue)
            return;
        this.isProcessingQueue = true;
        while (this.processingQueue.length > 0) {
            const task = this.processingQueue.shift();
            if (!task)
                continue;
            const { sessionName, sender, combinedText, mediaUrls } = task;
            try {
                const instanceData = await this.prisma.whatsappInstance.findUnique({
                    where: { instanceName: sessionName },
                    include: { channelAccount: true }
                });
                const isMarketingChannel = instanceData?.channelAccount?.name?.toLowerCase().includes('marketing') || sessionName === 'CLI_TEST_SESSION';
                const mockBot = {
                    sendMessage: async (chatId, text, options) => {
                        this.logger.log(`\n================================`);
                        this.logger.log(`[Omnichannel Bridge] Telegram Bot mengirim TEKS ke WAHA:`);
                        this.logger.log(text);
                        this.logger.log(`================================\n`);
                        if (sessionName !== 'CLI_TEST_SESSION') {
                            await this.wahaService.sendMessage(sessionName, chatId, text);
                        }
                        else {
                            this.cliOutputQueue.push({ type: 'text', text: `[Design Bot]: ${text}` });
                        }
                    },
                    sendPhoto: async (chatId, photo, options) => {
                        this.logger.log(`\n================================`);
                        this.logger.log(`[Omnichannel Bridge] Telegram Bot mengirim GAMBAR ke WAHA.`);
                        this.logger.log(`Caption: ${options?.caption || '(Tanpa Caption)'}`);
                        this.logger.log(`================================\n`);
                        let photoData = photo;
                        if (Buffer.isBuffer(photo)) {
                            photoData = `data:image/jpeg;base64,${photo.toString('base64')}`;
                        }
                        if (sessionName !== 'CLI_TEST_SESSION') {
                            await this.wahaService.sendImage(sessionName, chatId, photoData, options?.caption || '');
                        }
                        else {
                            const photoDataStr = typeof photoData === 'string' ? photoData : '[Buffer]';
                            this.cliOutputQueue.push({ type: 'image', text: `[Design Bot mengirim GAMBAR]\nCaption: ${options?.caption || '(Tanpa Caption)'}\nData/URL: ${photoDataStr.substring(0, 50)}...` });
                        }
                    },
                    getFileLink: async (fileId) => {
                        return fileId;
                    }
                };
                const mockPhoto = mediaUrls.length > 0 ? [{ file_id: mediaUrls[0] }] : undefined;
                const mockMsg = {
                    chat: { id: sender },
                    text: combinedText,
                    photo: mockPhoto
                };
                const activeDesignSession = await this.designSessionService.getSession(sender);
                const hasActiveSession = activeDesignSession && !this.designSessionService.isExpired(activeDesignSession) && activeDesignSession.step !== 'selesai';
                let intent = 'CS';
                const overrideIntent = 'CS';
                if (overrideIntent === 'DESIGN') {
                    this.logger.log(`[Omnichannel] Routing ${sender} to DESIGN Bot`);
                    if (!hasActiveSession) {
                        await this.designSessionService.createSession(sender);
                    }
                    await this.designFlowService.handle(mockBot, mockMsg);
                }
                else {
                    this.logger.log(`[Omnichannel] Routing ${sender} to CS Bot (Luna)`);
                    const contact = await this.prisma.contact.findUnique({ where: { phone: sender } });
                    const conversation = contact ? await this.prisma.conversation.findUnique({
                        where: { instanceName_contactId: { instanceName: sessionName, contactId: contact.id } }
                    }) : null;
                    let chatHistory = [];
                    if (conversation) {
                        chatHistory = await this.prisma.message.findMany({
                            where: { conversationId: conversation.id },
                            orderBy: { createdAt: 'desc' },
                            take: 10
                        });
                        chatHistory.reverse();
                    }
                    const aiResponse = await this.aiService.generateLunaResponse(combinedText, sender, chatHistory);
                    const imageTagRegex = /\[GAMBAR:\s*([^\]]+)\]\s*(https?:\/\/[^\s]+)/gi;
                    const extractedImages = [];
                    let match;
                    while ((match = imageTagRegex.exec(aiResponse)) !== null) {
                        let url = match[2];
                        const gdriveMatch = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i.exec(url);
                        if (gdriveMatch) {
                            url = `https://drive.google.com/uc?export=download&id=${gdriveMatch[1]}`;
                        }
                        extractedImages.push({ caption: match[1].trim(), url: url, rawText: match[0] });
                    }
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
                    cleanText = cleanText.replace(/URL:\s*/gi, '');
                    cleanText = cleanText.replace(/^\s*\d+\.\s*[^:\n]+:?\s*$/gm, '');
                    cleanText = cleanText.replace(/\n{3,}/g, '\n\n').trim();
                    if (extractedImages.length > 0) {
                        this.logger.log(`\n================================`);
                        this.logger.log(`[Omnichannel Bridge] CS Bot mengirim ${extractedImages.length} GAMBAR ke WAHA.`);
                        this.logger.log(`================================\n`);
                        if (sessionName !== 'CLI_TEST_SESSION') {
                            if (cleanText.length > 5) {
                                await this.wahaService.sendMessage(sessionName, sender, cleanText);
                            }
                            for (const img of extractedImages) {
                                await this.wahaService.sendImage(sessionName, sender, img.url, img.caption);
                            }
                        }
                        else {
                            if (cleanText.length > 5) {
                                this.cliOutputQueue.push({ type: 'text', text: `[Zafi Property]: ${cleanText}` });
                            }
                            for (const img of extractedImages) {
                                this.cliOutputQueue.push({ type: 'image', text: `[Zafi Property mengirim GAMBAR]\nCaption: ${img.caption}\nURL: ${img.url}` });
                            }
                        }
                    }
                    else {
                        this.logger.log(`\n================================`);
                        this.logger.log(`[Omnichannel Bridge] CS Bot mengirim TEKS ke WAHA:`);
                        this.logger.log(cleanText);
                        this.logger.log(`================================\n`);
                        if (sessionName !== 'CLI_TEST_SESSION') {
                            await this.wahaService.sendMessage(sessionName, sender, cleanText);
                        }
                        else {
                            this.cliOutputQueue.push({ type: 'text', text: `[Zafy Property]: ${cleanText}` });
                        }
                    }
                }
            }
            catch (error) {
                this.logger.error(`Failed to process queue task for ${sender}: ${error.message}`);
            }
        }
        this.isProcessingQueue = false;
    }
};
exports.WahaController = WahaController;
__decorate([
    (0, common_1.Post)('instances'),
    __param(0, (0, common_1.Body)('name')),
    __param(1, (0, common_1.Body)('webhookUrl')),
    __param(2, (0, common_1.Body)('channelAccountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], WahaController.prototype, "createInstance", null);
__decorate([
    (0, common_1.Post)('instances/:id/stop'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WahaController.prototype, "stopInstance", null);
__decorate([
    (0, common_1.Post)('instances/:id/logout'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WahaController.prototype, "logoutInstance", null);
__decorate([
    (0, common_1.Delete)('instances/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WahaController.prototype, "deleteInstance", null);
__decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Get)('instances'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WahaController.prototype, "getInstances", null);
__decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Get)('instances/:id/qr'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WahaController.prototype, "getQrCode", null);
__decorate([
    (0, common_1.Post)('instances/:id/send'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WahaController.prototype, "sendMessage", null);
__decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Get)('instances/:id/logs'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WahaController.prototype, "getLogs", null);
__decorate([
    (0, common_1.Get)('cli-poll'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WahaController.prototype, "cliPoll", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WahaController.prototype, "handleWebhook", null);
exports.WahaController = WahaController = WahaController_1 = __decorate([
    (0, common_1.Controller)('api/v1/waha'),
    __metadata("design:paramtypes", [waha_service_1.WahaService,
        prisma_service_1.PrismaService,
        ai_service_1.AiService,
        design_flow_service_1.DesignFlowService,
        design_session_service_1.DesignSessionService])
], WahaController);
//# sourceMappingURL=waha.controller.js.map