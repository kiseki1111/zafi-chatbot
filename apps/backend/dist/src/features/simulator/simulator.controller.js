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
var SimulatorController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulatorController = void 0;
const common_1 = require("@nestjs/common");
const agent_assistant_service_1 = require("../agent-assistant/agent-assistant.service");
const cs_service_1 = require("../agent-cs/cs.service");
const prisma_service_1 = require("../../core/prisma/prisma.service");
let SimulatorController = SimulatorController_1 = class SimulatorController {
    agentAssistantService;
    csService;
    prisma;
    logger = new common_1.Logger(SimulatorController_1.name);
    INSTANCE_NAME = 'telegram-dev-bot';
    constructor(agentAssistantService, csService, prisma) {
        this.agentAssistantService = agentAssistantService;
        this.csService = csService;
        this.prisma = prisma;
    }
    async saveMessageToDb(chatId, senderName, text, senderType) {
        try {
            const msgId = Date.now().toString() + Math.floor(Math.random() * 1000).toString();
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
                    lastMessageAt: new Date(),
                    unreadCount: senderType === 'customer' ? { increment: 1 } : undefined
                },
                create: {
                    instanceName: this.INSTANCE_NAME,
                    contactId: contact.id,
                    unreadCount: senderType === 'customer' ? 1 : 0,
                }
            });
            await this.prisma.message.create({
                data: {
                    wahaMessageId: msgId,
                    conversationId: conversation.id,
                    senderType: senderType,
                    messageType: 'text',
                    content: text,
                    status: senderType === 'bot' ? 'SENT' : 'RECEIVED',
                    metadata: { simulator: true }
                }
            });
        }
        catch (e) {
            this.logger.warn(`Failed to save simulator message to DB: ${e.message}`);
        }
    }
    async getHistory(chatId) {
        try {
            const contact = await this.prisma.contact.findUnique({
                where: { phone: chatId }
            });
            if (!contact)
                return { messages: [] };
            const conversation = await this.prisma.conversation.findUnique({
                where: {
                    instanceName_contactId: { instanceName: this.INSTANCE_NAME, contactId: contact.id }
                }
            });
            if (!conversation)
                return { messages: [] };
            const messages = await this.prisma.message.findMany({
                where: { conversationId: conversation.id },
                orderBy: { createdAt: 'asc' },
                take: 50
            });
            return {
                messages: messages.map(m => ({
                    id: m.id,
                    sender: m.senderType === 'customer' ? 'user' : 'bot',
                    text: m.content
                }))
            };
        }
        catch (e) {
            this.logger.error(`Error fetching history: ${e.message}`);
            return { messages: [] };
        }
    }
    async chatSimulator(body, res) {
        const { message, simulateAs, tenantId, chatId } = body;
        try {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Transfer-Encoding', 'chunked');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            await this.saveMessageToDb(chatId, simulateAs === 'owner' ? 'Owner (Sim)' : 'Customer (Sim)', message, 'customer');
            let realTenantId = tenantId;
            if (tenantId === 'demo' || tenantId.startsWith('t-')) {
                const firstOwner = await this.prisma.user.findFirst({ where: { role: 'owner' } });
                if (firstOwner && firstOwner.tenantId) {
                    realTenantId = firstOwner.tenantId;
                }
            }
            let fullBotResponse = "";
            const onChunk = (chunk) => {
                fullBotResponse += chunk;
                res.write(chunk);
            };
            if (simulateAs === 'owner') {
                await this.agentAssistantService.chatWithOwnerAssistant(message, realTenantId, chatId, onChunk);
                await this.saveMessageToDb(chatId, 'Asisten (Sim)', fullBotResponse, 'bot');
            }
            else {
                await this.csService.handleMessage({
                    senderId: chatId,
                    text: message,
                    provider: 'TELEGRAM',
                    sessionName: this.INSTANCE_NAME,
                    tenantId: realTenantId,
                    replyCallback: async () => { },
                }, onChunk);
                let textToSave = fullBotResponse;
                try {
                    const parsed = JSON.parse(fullBotResponse);
                    if (parsed.text)
                        textToSave = parsed.text.replace(/[*~`]/g, '');
                    if (parsed.order) {
                        const notifText = `🔥 *Pesanan Baru Masuk!*\n\nDari: ${parsed.order.customerName || 'Pelanggan Simulator'}\nItem: ${parsed.order.items || '-'}\nTotal: Rp${parsed.order.totalPrice || 0}\n\nKetik "proses pesanan ini" jika sudah siap.`;
                        const ownerChatId = chatId.replace('-customer', '-owner');
                        await this.saveMessageToDb(ownerChatId, 'Bot Asisten', notifText, 'bot');
                    }
                }
                catch (e) {
                }
                await this.saveMessageToDb(chatId, 'CS (Sim)', textToSave, 'bot');
            }
            res.end();
        }
        catch (e) {
            this.logger.error(`Simulator error: ${e.message}`, e.stack);
            if (!res.headersSent) {
                res.status(500).json({ error: e.message });
            }
            else {
                res.write(`\n\n[ERROR]: ${e.message}`);
                res.end();
            }
        }
    }
};
exports.SimulatorController = SimulatorController;
__decorate([
    (0, common_1.Get)('history/:chatId'),
    __param(0, (0, common_1.Param)('chatId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SimulatorController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SimulatorController.prototype, "chatSimulator", null);
exports.SimulatorController = SimulatorController = SimulatorController_1 = __decorate([
    (0, common_1.Controller)('api/v1/agent/simulator'),
    __metadata("design:paramtypes", [agent_assistant_service_1.AgentAssistantService,
        cs_service_1.CsService,
        prisma_service_1.PrismaService])
], SimulatorController);
//# sourceMappingURL=simulator.controller.js.map