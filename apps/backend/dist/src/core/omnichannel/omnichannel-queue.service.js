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
var OmnichannelQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OmnichannelQueueService = void 0;
const common_1 = require("@nestjs/common");
const cs_service_1 = require("../../features/agent-cs/cs.service");
let OmnichannelQueueService = OmnichannelQueueService_1 = class OmnichannelQueueService {
    csService;
    logger = new common_1.Logger(OmnichannelQueueService_1.name);
    messageBuffer = new Map();
    processingQueue = [];
    isProcessingQueue = false;
    constructor(csService) {
        this.csService = csService;
    }
    enqueue(message) {
        const { senderId, text, provider } = message;
        const bufferKey = `${provider}_${senderId}`;
        const existing = this.messageBuffer.get(bufferKey);
        if (existing) {
            clearTimeout(existing.timer);
            existing.texts.push(text);
            existing.message.text = existing.texts.join('\n');
            existing.timer = setTimeout(() => {
                const buffered = this.messageBuffer.get(bufferKey);
                if (buffered) {
                    this.processingQueue.push(buffered.message);
                    this.messageBuffer.delete(bufferKey);
                    this.processQueue();
                }
            }, 10000);
        }
        else {
            this.messageBuffer.set(bufferKey, {
                texts: [text],
                message: { ...message },
                timer: setTimeout(() => {
                    const buffered = this.messageBuffer.get(bufferKey);
                    if (buffered) {
                        this.processingQueue.push(buffered.message);
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
            try {
                this.logger.log(`[Omnichannel] Memproses pesan dari ${task.senderId} via ${task.provider}`);
                const response = await this.csService.handleMessage(task);
                await task.replyCallback(response);
            }
            catch (error) {
                this.logger.error(`[Omnichannel] Error memproses pesan dari ${task.senderId}: ${error.message}`);
                try {
                    await task.replyCallback({ text: 'Maaf, sistem sedang sibuk. Mohon coba beberapa saat lagi.', images: [] });
                }
                catch (e) { }
            }
        }
        this.isProcessingQueue = false;
    }
};
exports.OmnichannelQueueService = OmnichannelQueueService;
exports.OmnichannelQueueService = OmnichannelQueueService = OmnichannelQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cs_service_1.CsService])
], OmnichannelQueueService);
//# sourceMappingURL=omnichannel-queue.service.js.map