"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeIngestModule = void 0;
const common_1 = require("@nestjs/common");
const excel_parser_1 = require("./services/parsers/excel-parser");
const document_parser_1 = require("./services/parsers/document-parser");
const image_parser_1 = require("./services/parsers/image-parser");
const knowledge_ai_service_1 = require("./services/knowledge-ai.service");
const ingestion_router_service_1 = require("./services/ingestion-router.service");
const prisma_module_1 = require("../../core/prisma/prisma.module");
const config_1 = require("@nestjs/config");
const rag_service_1 = require("./rag.service");
const data_agent_service_1 = require("./data-agent.service");
const agent_shared_module_1 = require("../../core/agent-shared/agent-shared.module");
let KnowledgeIngestModule = class KnowledgeIngestModule {
};
exports.KnowledgeIngestModule = KnowledgeIngestModule;
exports.KnowledgeIngestModule = KnowledgeIngestModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, config_1.ConfigModule, agent_shared_module_1.AgentSharedModule],
        providers: [
            excel_parser_1.ExcelParser,
            document_parser_1.DocumentParser,
            image_parser_1.ImageParser,
            knowledge_ai_service_1.KnowledgeAiService,
            ingestion_router_service_1.IngestionRouterService,
            rag_service_1.RagService,
            data_agent_service_1.DataAgentService,
        ],
        exports: [ingestion_router_service_1.IngestionRouterService, rag_service_1.RagService, data_agent_service_1.DataAgentService],
    })
], KnowledgeIngestModule);
//# sourceMappingURL=knowledge-ingest.module.js.map