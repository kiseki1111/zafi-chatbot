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
var DesignSessionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignSessionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../infrastructure/prisma/prisma.service");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
const EXPIRY_HOURS = 24;
let DesignSessionService = DesignSessionService_1 = class DesignSessionService {
    prisma;
    configService;
    logger = new common_1.Logger(DesignSessionService_1.name);
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async getSession(userId) {
        return this.prisma.designSession.findUnique({ where: { userId } });
    }
    isExpired(session) {
        if (!session)
            return true;
        return new Date() > new Date(session.expiresAt);
    }
    async createSession(userId) {
        const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);
        return this.prisma.designSession.upsert({
            where: { userId },
            update: {
                step: 'prompting',
                data: {},
                expiresAt,
                lastActive: new Date(),
            },
            create: {
                userId,
                step: 'prompting',
                data: {},
                expiresAt,
            },
        });
    }
    async updateSession(userId, step, newData = {}) {
        const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);
        return this.prisma.designSession.update({
            where: { userId },
            data: {
                step,
                data: newData,
                lastActive: new Date(),
                expiresAt,
            },
        });
    }
    async saveGeneration(userId, prompt, imageUrl, designType, status = 'success') {
        return this.prisma.designGeneration.create({
            data: { userId, prompt, imageUrl, designType, status },
        });
    }
    async saveAssetToSupabase(userId, imageBase64, metadata = {}) {
        const supabaseUrl = this.configService.get('SUPABASE_URL');
        const supabaseKey = this.configService.get('SUPABASE_KEY');
        if (!supabaseUrl || !supabaseKey) {
            this.logger.warn('Supabase credentials not found. Skipping upload.');
            return null;
        }
        const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
        const filename = `design-bot/${userId}/asset_${Date.now()}.png`;
        const buffer = Buffer.from(imageBase64, 'base64');
        const { error } = await supabase.storage
            .from('asset-telegram')
            .upload(filename, buffer, { contentType: 'image/png', upsert: true });
        if (error) {
            this.logger.error('Gagal upload ke Supabase:', error);
            return null;
        }
        const { data: urlData } = supabase.storage
            .from('asset-telegram')
            .getPublicUrl(filename);
        return urlData.publicUrl;
    }
};
exports.DesignSessionService = DesignSessionService;
exports.DesignSessionService = DesignSessionService = DesignSessionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], DesignSessionService);
//# sourceMappingURL=design-session.service.js.map