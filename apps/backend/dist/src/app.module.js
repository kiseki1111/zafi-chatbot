"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const users_module_1 = require("./modules/users/users.module");
const auth_module_1 = require("./modules/auth/auth.module");
const prisma_module_1 = require("./infrastructure/prisma/prisma.module");
const channel_accounts_module_1 = require("./modules/channel-accounts/channel-accounts.module");
const waha_module_1 = require("./modules/waha/waha.module");
const chats_module_1 = require("./modules/chats/chats.module");
const telegram_module_1 = require("./modules/telegram/telegram.module");
const jwt_config_1 = __importDefault(require("./config/jwt.config"));
const ai_module_1 = require("./modules/ai/ai.module");
const knowledge_module_1 = require("./modules/knowledge/knowledge.module");
const app_controller_1 = require("./app.controller");
const openai_module_1 = require("./infrastructure/openai/openai.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [jwt_config_1.default],
            }),
            throttler_1.ThrottlerModule.forRoot([{
                    ttl: 900000,
                    limit: 3000,
                }]),
            prisma_module_1.PrismaModule,
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            channel_accounts_module_1.ChannelAccountsModule,
            waha_module_1.WahaModule,
            chats_module_1.ChatsModule,
            ai_module_1.AiModule,
            knowledge_module_1.KnowledgeModule,
            telegram_module_1.TelegramModule,
            openai_module_1.OpenAiModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map