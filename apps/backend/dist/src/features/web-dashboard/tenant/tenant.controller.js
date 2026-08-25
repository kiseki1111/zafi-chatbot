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
exports.TenantController = void 0;
const common_1 = require("@nestjs/common");
const tenant_service_1 = require("./tenant.service");
const onboarding_dto_1 = require("./dto/onboarding.dto");
let TenantController = class TenantController {
    tenantService;
    constructor(tenantService) {
        this.tenantService = tenantService;
    }
    async getDashboard(userId) {
        return this.tenantService.getDashboardOverview(userId);
    }
    async updateSettings(userId, body) {
        return this.tenantService.updateTenantSettings(userId, body);
    }
    async getAgentReport(userId) {
        return this.tenantService.getAgentReport(userId);
    }
    async completeOnboarding(userId, dto) {
        return this.tenantService.completeOnboarding(userId, dto);
    }
    async getProducts(userId) {
        return this.tenantService.getTenantProducts(userId);
    }
    async addProduct(userId, body) {
        return this.tenantService.addTenantProduct(userId, body);
    }
    async updateProduct(userId, productId, body) {
        return this.tenantService.updateTenantProduct(userId, productId, body);
    }
    async deleteProduct(userId, productId) {
        return this.tenantService.deleteTenantProduct(userId, productId);
    }
    async getKnowledge(userId) {
        return this.tenantService.getTenantKnowledge(userId);
    }
    async addKnowledge(userId, body) {
        return this.tenantService.addTenantKnowledge(userId, body.content);
    }
    async updateKnowledge(userId, knowledgeId, body) {
        return this.tenantService.updateTenantKnowledge(userId, knowledgeId, body.content);
    }
    async deleteKnowledge(userId, knowledgeId) {
        return this.tenantService.deleteTenantKnowledge(userId, knowledgeId);
    }
    async getSales(userId) {
        return this.tenantService.getTenantSales(userId);
    }
};
exports.TenantController = TenantController;
__decorate([
    (0, common_1.Get)(':userId/dashboard'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Patch)(':userId/settings'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)(':userId/report'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "getAgentReport", null);
__decorate([
    (0, common_1.Put)(':userId/onboarding'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, onboarding_dto_1.OnboardingDto]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "completeOnboarding", null);
__decorate([
    (0, common_1.Get)(':userId/products'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Post)(':userId/products'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "addProduct", null);
__decorate([
    (0, common_1.Patch)(':userId/products/:productId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Delete)(':userId/products/:productId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "deleteProduct", null);
__decorate([
    (0, common_1.Get)(':userId/knowledge'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "getKnowledge", null);
__decorate([
    (0, common_1.Post)(':userId/knowledge'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "addKnowledge", null);
__decorate([
    (0, common_1.Patch)(':userId/knowledge/:knowledgeId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('knowledgeId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "updateKnowledge", null);
__decorate([
    (0, common_1.Delete)(':userId/knowledge/:knowledgeId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Param)('knowledgeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "deleteKnowledge", null);
__decorate([
    (0, common_1.Get)(':userId/sales'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "getSales", null);
exports.TenantController = TenantController = __decorate([
    (0, common_1.Controller)('api/v1/tenant'),
    __metadata("design:paramtypes", [tenant_service_1.TenantService])
], TenantController);
//# sourceMappingURL=tenant.controller.js.map