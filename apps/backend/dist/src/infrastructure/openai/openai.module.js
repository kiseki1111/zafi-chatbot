"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiModule = exports.OPENAI_CLIENT = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = require("openai");
exports.OPENAI_CLIENT = 'OPENAI_CLIENT';
let OpenAiModule = class OpenAiModule {
};
exports.OpenAiModule = OpenAiModule;
exports.OpenAiModule = OpenAiModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            {
                provide: exports.OPENAI_CLIENT,
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const openaiApiKey = configService.get('CHATGPT_API_KEY') || configService.get('OPENAI_API_KEY');
                    const openaiBaseUrl = configService.get('OPENAI_BASE_URL');
                    if (!openaiApiKey) {
                        console.warn('OpenAI API Key is not configured. AI features will not work.');
                        return null;
                    }
                    return new openai_1.OpenAI({
                        apiKey: openaiApiKey,
                        baseURL: openaiBaseUrl || undefined,
                    });
                },
            },
        ],
        exports: [exports.OPENAI_CLIENT],
    })
], OpenAiModule);
//# sourceMappingURL=openai.module.js.map