"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentAssistantModule = void 0;
const common_1 = require("@nestjs/common");
const agent_assistant_service_1 = require("./agent-assistant.service");
const prisma_module_1 = require("../../core/prisma/prisma.module");
const knowledge_ingest_module_1 = require("../knowledge-ingest/knowledge-ingest.module");
const openai_module_1 = require("../../core/openai/openai.module");
const agent_shared_module_1 = require("../../core/agent-shared/agent-shared.module");
let AgentAssistantModule = class AgentAssistantModule {
};
exports.AgentAssistantModule = AgentAssistantModule;
exports.AgentAssistantModule = AgentAssistantModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            (0, common_1.forwardRef)(() => knowledge_ingest_module_1.KnowledgeIngestModule),
            openai_module_1.OpenAiModule,
            agent_shared_module_1.AgentSharedModule,
        ],
        providers: [agent_assistant_service_1.AgentAssistantService],
        exports: [agent_assistant_service_1.AgentAssistantService],
    })
], AgentAssistantModule);
//# sourceMappingURL=agent-assistant.module.js.map