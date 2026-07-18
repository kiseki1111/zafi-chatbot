"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramModule = void 0;
const common_1 = require("@nestjs/common");
const telegram_service_1 = require("./telegram.service");
const prisma_module_1 = require("../../infrastructure/prisma/prisma.module");
const ai_module_1 = require("../ai/ai.module");
const onboarding_module_1 = require("../onboarding/onboarding.module");
const design_flow_service_1 = require("./design/design-flow.service");
const design_ai_service_1 = require("./design/design-ai.service");
const design_image_service_1 = require("./design/design-image.service");
const design_session_service_1 = require("./design/design-session.service");
let TelegramModule = class TelegramModule {
};
exports.TelegramModule = TelegramModule;
exports.TelegramModule = TelegramModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, ai_module_1.AiModule, onboarding_module_1.OnboardingModule],
        providers: [
            telegram_service_1.TelegramService,
            design_flow_service_1.DesignFlowService,
            design_ai_service_1.DesignAiService,
            design_image_service_1.DesignImageService,
            design_session_service_1.DesignSessionService,
        ],
        exports: [telegram_service_1.TelegramService, design_flow_service_1.DesignFlowService, design_session_service_1.DesignSessionService],
    })
], TelegramModule);
//# sourceMappingURL=telegram.module.js.map