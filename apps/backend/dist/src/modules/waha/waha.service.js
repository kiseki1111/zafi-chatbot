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
var WahaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WahaService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../core/prisma/prisma.service");
let WahaService = WahaService_1 = class WahaService {
    configService;
    prisma;
    logger = new common_1.Logger(WahaService_1.name);
    baseUrl;
    apiKey;
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        this.baseUrl = this.configService.get('WAHA_API_URL', 'http://103.30.195.145:3060');
        this.apiKey = this.configService.get('WAHA_API_KEY', 'ZafitechDunia12345#');
    }
    getHeaders() {
        return {
            'Accept': 'application/json',
            'X-Api-Key': this.apiKey,
        };
    }
    async randomDelay(minMs = 3000, maxMs = 7000) {
        const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
        this.logger.log(`Sleeping for ${delay}ms before sending message (Anti-Spam)...`);
        return new Promise(resolve => setTimeout(resolve, delay));
    }
    async adaptiveWpmDelay(text, wpm = 70) {
        const finalDelay = Math.floor(Math.random() * (4000 - 3000 + 1)) + 3000;
        this.logger.log(`Typing delay: sleeping for ${finalDelay}ms...`);
        return new Promise(resolve => setTimeout(resolve, finalDelay));
    }
    async sendTypingPresence(sessionName, chatId) {
        try {
            await axios_1.default.post(`${this.baseUrl}/api/startTyping`, { session: sessionName, chatId: chatId }, { headers: this.getHeaders() });
        }
        catch (error) {
            this.logger.debug(`Could not send typing presence for ${sessionName}. Error: ${error.message}`);
        }
    }
    async startSession(sessionName, webhookUrls, channelAccountId, tenantId) {
        try {
            let validTenantId = tenantId;
            if (tenantId) {
                const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } }).catch(() => null);
                if (!tenant) {
                    this.logger.warn(`Tenant ${tenantId} not found, creating instance without tenant association`);
                    validTenantId = undefined;
                }
            }
            await this.prisma.whatsappInstance.upsert({
                where: { instanceName: sessionName },
                update: { channelAccountId: channelAccountId || null, tenantId: validTenantId || null },
                create: { instanceName: sessionName, channelAccountId: channelAccountId || null, tenantId: validTenantId || null, status: 'STOPPED' }
            });
            const payload = { name: sessionName };
            if (webhookUrls) {
                const urls = Array.isArray(webhookUrls) ? webhookUrls : [webhookUrls];
                const formattedUrls = urls.map(url => {
                    let finalUrl = url.trim();
                    if (!finalUrl.endsWith('/api/v1/waha/webhook')) {
                        finalUrl = finalUrl.replace(/\/$/, '') + '/api/v1/waha/webhook';
                    }
                    return finalUrl;
                });
                payload.config = {
                    webhooks: formattedUrls.map(url => ({
                        url: url,
                        events: ['message', 'message.any', 'session.status'],
                        retries: {
                            delaySeconds: 10,
                            attempts: 15,
                            policy: 'fixed'
                        }
                    }))
                };
            }
            payload.config = payload.config || {};
            payload.config.noweb = {
                markOnline: false,
                store: {
                    enabled: true,
                    fullSync: false
                }
            };
            payload.config.ignore = {
                status: false,
                groups: false,
                channels: false,
                broadcast: false
            };
            const response = await axios_1.default.post(`${this.baseUrl}/api/sessions/start`, payload, { headers: this.getHeaders() });
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to start session ${sessionName}`, error.message);
            throw error;
        }
    }
    async getSessions() {
        try {
            let wahaSessions = [];
            try {
                const response = await axios_1.default.get(`${this.baseUrl}/api/sessions`, {
                    headers: this.getHeaders(),
                    timeout: 5000,
                });
                wahaSessions = response.data || [];
            }
            catch (httpErr) {
                this.logger.warn(`WAHA API is unreachable: ${httpErr.message}. Falling back to database records.`);
            }
            const mergedSessions = await Promise.all(wahaSessions.map(async (ws) => {
                const instance = await this.prisma.whatsappInstance.upsert({
                    where: { instanceName: ws.name },
                    update: {
                        status: ws.status,
                        phone: ws.me?.id,
                        profileName: ws.me?.pushName,
                    },
                    create: {
                        instanceName: ws.name,
                        status: ws.status,
                        phone: ws.me?.id,
                        profileName: ws.me?.pushName,
                    }
                });
                return { ...ws, dbStats: instance };
            }));
            return mergedSessions;
        }
        catch (error) {
            this.logger.error(`Failed to get sessions: ${error.message}`);
            throw error;
        }
    }
    async sendMessage(sessionName, chatId, text) {
        try {
            await this.sendTypingPresence(sessionName, chatId);
            await this.adaptiveWpmDelay(text, 70);
            const response = await axios_1.default.post(`${this.baseUrl}/api/sendText`, { session: sessionName, chatId: chatId, text: text }, { headers: this.getHeaders() });
            await this.prisma.whatsappInstance.update({
                where: { instanceName: sessionName },
                data: { messagesSent: { increment: 1 } }
            }).catch(e => this.logger.warn(`Failed to increment messagesSent for ${sessionName}`));
            return response.data;
        }
        catch (error) {
            const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            this.logger.error(`Failed to send message: ${errorDetail}`);
            await this.prisma.whatsappInstance.update({
                where: { instanceName: sessionName },
                data: { messagesFailed: { increment: 1 } }
            }).catch(e => this.logger.warn(`Failed to increment messagesFailed for ${sessionName}`));
            throw error;
        }
    }
    async sendImage(sessionName, chatId, imageUrl, caption) {
        try {
            await this.sendTypingPresence(sessionName, chatId);
            const imageResponse = await axios_1.default.get(imageUrl, { responseType: 'arraybuffer' });
            const base64Data = Buffer.from(imageResponse.data).toString('base64');
            const mimeType = String(imageResponse.headers['content-type'] || 'image/jpeg');
            const payload = {
                session: sessionName,
                chatId: chatId,
                file: {
                    mimetype: mimeType.includes('text/html') ? 'image/jpeg' : mimeType,
                    filename: 'property-image.jpg',
                    data: base64Data
                }
            };
            if (caption) {
                payload.caption = caption;
            }
            const response = await axios_1.default.post(`${this.baseUrl}/api/sendImage`, payload, { headers: this.getHeaders() });
            await this.prisma.whatsappInstance.update({
                where: { instanceName: sessionName },
                data: { messagesSent: { increment: 1 } }
            }).catch(e => this.logger.warn(`Failed to increment messagesSent for ${sessionName}`));
            return response.data;
        }
        catch (error) {
            const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            this.logger.error(`Failed to send image: ${errorDetail}`);
            await this.prisma.whatsappInstance.update({
                where: { instanceName: sessionName },
                data: { messagesFailed: { increment: 1 } }
            }).catch(e => this.logger.warn(`Failed to increment messagesFailed for ${sessionName}`));
            throw error;
        }
    }
    async getQrCode(sessionName) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/api/${sessionName}/auth/qr`, {
                headers: { ...this.getHeaders(), 'Accept': 'image/png' },
                responseType: 'arraybuffer',
            });
            return response.data;
        }
        catch (error) {
            try {
                const fallbackResponse = await axios_1.default.get(`${this.baseUrl}/api/sessions/${sessionName}/auth/qr`, {
                    headers: { ...this.getHeaders(), 'Accept': 'image/png' },
                    responseType: 'arraybuffer',
                });
                return fallbackResponse.data;
            }
            catch (innerError) {
                this.logger.error(`Failed to get QR code for session ${sessionName}`, innerError.message);
                throw innerError;
            }
        }
    }
    async stopSession(sessionName) {
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/api/sessions/stop`, { name: sessionName }, { headers: this.getHeaders() });
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to stop session ${sessionName}`, error.message);
            throw error;
        }
    }
    async logoutSession(sessionName) {
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/api/sessions/logout`, { name: sessionName }, { headers: this.getHeaders() });
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to logout session ${sessionName}`, error.message);
            throw error;
        }
    }
};
exports.WahaService = WahaService;
exports.WahaService = WahaService = WahaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], WahaService);
//# sourceMappingURL=waha.service.js.map