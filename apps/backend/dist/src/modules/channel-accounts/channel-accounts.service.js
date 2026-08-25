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
exports.ChannelAccountsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
let ChannelAccountsService = class ChannelAccountsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createChannelAccountDto) {
        return this.prisma.channelAccount.create({
            data: {
                name: createChannelAccountDto.name,
                description: createChannelAccountDto.description,
            },
        });
    }
    async findAll() {
        return this.prisma.channelAccount.findMany({
            include: {
                whatsappInstances: true,
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async findOne(id) {
        return this.prisma.channelAccount.findUnique({
            where: { id },
            include: {
                whatsappInstances: true,
            },
        });
    }
    async update(id, updateChannelAccountDto) {
        return this.prisma.channelAccount.update({
            where: { id },
            data: updateChannelAccountDto,
        });
    }
    async remove(id) {
        return this.prisma.channelAccount.delete({
            where: { id },
        });
    }
};
exports.ChannelAccountsService = ChannelAccountsService;
exports.ChannelAccountsService = ChannelAccountsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChannelAccountsService);
//# sourceMappingURL=channel-accounts.service.js.map