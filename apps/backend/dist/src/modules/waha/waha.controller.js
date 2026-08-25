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
const prisma_service_1 = require("../../core/prisma/prisma.service");
const omnichannel_queue_service_1 = require("../../core/omnichannel/omnichannel-queue.service");
let WahaController = WahaController_1 = class WahaController {
    wahaService;
    prisma;
    omnichannelQueue;
    logger = new common_1.Logger(WahaController_1.name);
    cliOutputQueue = [];
    constructor(wahaService, prisma, omnichannelQueue) {
        this.wahaService = wahaService;
        this.prisma = prisma;
        this.omnichannelQueue = omnichannelQueue;
    }
    async createInstance(name, webhookUrl, channelAccountId) {
        try {
            let webhooks = [];
            if (process.env.WEBHOOK_URL) {
                webhooks.push(process.env.WEBHOOK_URL);
            }
            if (webhookUrl && !webhookUrl.includes('localhost') && !webhookUrl.includes('127.0.0.1')) {
                webhooks.push(webhookUrl);
            }
            webhooks.push('http://backend:3030/api/v1/waha/webhook');
            webhooks.push('http://iqbal-backend:3030/api/v1/waha/webhook');
            webhooks.push('http://172.17.0.1:3030/api/v1/waha/webhook');
            webhooks.push('http://103.30.195.145:3030/api/v1/waha/webhook');
            this.logger.log(`[WAHA] Mendaftarkan total ${webhooks.length} Webhook sekaligus: ${webhooks.join(', ')}`);
            return await this.wahaService.startSession(name, webhooks, channelAccountId);
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
            this.logger.log(`\n[WAHA PESAN BARU - WHATSAPP] Waktu: ${timestamp} | Dari: ${sender} | Isi: "${text}"\n`);
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
                let text = message.body?.trim() || '';
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
                const mediaUrls = message.mediaUrl ? [message.mediaUrl] : [];
                if (text || mediaUrls.length > 0) {
                    const incomingMessage = {
                        senderId: sender,
                        text: text,
                        mediaUrls: mediaUrls,
                        provider: 'WAHA',
                        sessionName: sessionName,
                        replyCallback: async (reply) => {
                            if (reply.text && reply.text.length > 0) {
                                if (sessionName === 'CLI_TEST_SESSION') {
                                    this.cliOutputQueue.push({ type: 'text', text: `[Waha Bot]: ${reply.text}` });
                                }
                                else {
                                    await this.wahaService.sendMessage(sessionName, sender, reply.text);
                                }
                            }
                            if (reply.order) {
                                const instance = await this.prisma.whatsappInstance.findUnique({ where: { instanceName: sessionName } });
                                if (instance?.tenantId) {
                                    const tenant = await this.prisma.tenant.findUnique({ where: { id: instance.tenantId } });
                                    await this.prisma.salesRecord.create({
                                        data: {
                                            receiptNumber: `INV-${Date.now()}`,
                                            tenantId: instance.tenantId,
                                            quantity: reply.order.quantity || 1,
                                            totalPrice: reply.order.totalPrice || 0,
                                            customerName: reply.order.customerName || 'Pelanggan WA',
                                            notes: reply.order.notes || '',
                                            source: 'WAHA',
                                            attributes: reply.order
                                        }
                                    }).catch(e => this.logger.warn(`Order save failed: ${e.message}`));
                                    if (tenant?.ownerChatId) {
                                        const notifText = `🔥 *Pesanan Baru Masuk!*\n\nDari: ${reply.order.customerName || 'Pelanggan'}\nItem: ${reply.order.items || '-'}\nTotal: Rp${reply.order.totalPrice || 0}\n\nKetik "proses pesanan ini" jika sudah siap.`;
                                        if (sessionName === 'CLI_TEST_SESSION') {
                                            this.cliOutputQueue.push({ type: 'text', text: `[NOTIF OWNER]: ${notifText}` });
                                        }
                                        else {
                                            await this.wahaService.sendMessage(sessionName, tenant.ownerChatId, notifText);
                                        }
                                    }
                                }
                            }
                            if (reply.images && reply.images.length > 0) {
                                for (const img of reply.images) {
                                    if (sessionName === 'CLI_TEST_SESSION') {
                                        this.cliOutputQueue.push({ type: 'image', text: `[Waha Bot img] URL: ${img.url}, Caption: ${img.caption}` });
                                    }
                                    else {
                                        await this.wahaService.sendImage(sessionName, sender, img.url, img.caption || '');
                                    }
                                }
                            }
                        }
                    };
                    this.omnichannelQueue.enqueue(incomingMessage);
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
        omnichannel_queue_service_1.OmnichannelQueueService])
], WahaController);
//# sourceMappingURL=waha.controller.js.map