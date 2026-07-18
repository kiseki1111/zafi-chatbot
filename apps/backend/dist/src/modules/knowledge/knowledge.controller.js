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
exports.KnowledgeController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const knowledge_service_1 = require("./knowledge.service");
const data_agent_service_1 = require("./data-agent.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
let KnowledgeController = class KnowledgeController {
    knowledgeService;
    dataAgentService;
    constructor(knowledgeService, dataAgentService) {
        this.knowledgeService = knowledgeService;
        this.dataAgentService = dataAgentService;
    }
    async syncGoogleSheet() {
        return this.knowledgeService.syncFromGoogleSheet();
    }
    async syncVectorKnowledge() {
        return this.dataAgentService.syncKnowledgeBase();
    }
};
exports.KnowledgeController = KnowledgeController;
__decorate([
    (0, common_1.Post)('sync'),
    (0, swagger_1.ApiOperation)({ summary: 'Sync knowledge base from Google Sheet (RAG)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "syncGoogleSheet", null);
__decorate([
    (0, common_1.Post)('sync-vector'),
    (0, swagger_1.ApiOperation)({ summary: 'Sync data (Products & KB) to VectorKnowledge table for RAG search' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "syncVectorKnowledge", null);
exports.KnowledgeController = KnowledgeController = __decorate([
    (0, swagger_1.ApiTags)('Knowledge Base'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('api/v1/knowledge'),
    __metadata("design:paramtypes", [knowledge_service_1.KnowledgeService,
        data_agent_service_1.DataAgentService])
], KnowledgeController);
//# sourceMappingURL=knowledge.controller.js.map