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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeController = void 0;
const common_1 = require("@nestjs/common");
const knowledge_service_1 = require("./knowledge.service");
const platform_express_1 = require("@nestjs/platform-express");
let KnowledgeController = class KnowledgeController {
    knowledgeService;
    constructor(knowledgeService) {
        this.knowledgeService = knowledgeService;
    }
    async findAll(req) {
        const tenantId = req.user?.tenantId || req.query.tenantId;
        if (!tenantId) {
            throw new common_1.BadRequestException('tenantId is required');
        }
        return this.knowledgeService.findAll(tenantId);
    }
    async createText(req, body) {
        const tenantId = req.user?.tenantId || req.query.tenantId || req.body.tenantId;
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        if (!body.title || !body.content)
            throw new common_1.BadRequestException('title and content are required');
        return this.knowledgeService.createText(tenantId, body.title, body.content);
    }
    async createFile(req, file, title) {
        const tenantId = req.user?.tenantId || req.query.tenantId || req.body.tenantId;
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        if (!file)
            throw new common_1.BadRequestException('File is required');
        return this.knowledgeService.createFile(tenantId, file, title);
    }
    async update(id, req, body) {
        const tenantId = body.tenantId || req.user?.tenantId || req.query.tenantId;
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        if (!body.title || !body.content)
            throw new common_1.BadRequestException('title and content are required');
        return this.knowledgeService.update(id, tenantId, body.title, body.content);
    }
    async remove(id, req) {
        const tenantId = req.user?.tenantId || req.query.tenantId;
        if (!tenantId)
            throw new common_1.BadRequestException('tenantId is required');
        return this.knowledgeService.remove(id, tenantId);
    }
};
exports.KnowledgeController = KnowledgeController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('text'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "createText", null);
__decorate([
    (0, common_1.Post)('file'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('title')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "createFile", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "remove", null);
exports.KnowledgeController = KnowledgeController = __decorate([
    (0, common_1.Controller)('api/v1/knowledge'),
    __metadata("design:paramtypes", [knowledge_service_1.KnowledgeService])
], KnowledgeController);
//# sourceMappingURL=knowledge.controller.js.map