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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
let ChatsService = class ChatsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getConversations(instanceName) {
        const where = instanceName ? { instanceName } : {};
        const conversations = await this.prisma.conversation.findMany({
            where,
            orderBy: { lastMessageAt: 'desc' },
            include: {
                assignedTo: {
                    select: { id: true, name: true, email: true },
                },
                contact: true,
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });
        return conversations.map(c => {
            let realPhone = c.contact?.phone;
            if (realPhone && realPhone.endsWith('@lid') && c.messages && c.messages.length > 0) {
                const msg = c.messages[0];
                const meta = msg.metadata;
                if (meta?._data?.key?.remoteJidAlt) {
                    realPhone = meta._data.key.remoteJidAlt;
                }
            }
            return {
                ...c,
                contactName: c.contact?.name,
                contactNumber: realPhone
            };
        });
    }
    async getMessages(conversationId, skip = 0, take = 20) {
        const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
        if (!conversation)
            throw new common_1.NotFoundException('Conversation not found');
        const messages = await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            skip,
            take,
            include: {
                sender: {
                    select: { id: true, name: true },
                },
            },
        });
        return messages.reverse();
    }
};
exports.ChatsService = ChatsService;
exports.ChatsService = ChatsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChatsService);
//# sourceMappingURL=chats.service.js.map