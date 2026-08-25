"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentCsModule = void 0;
const common_1 = require("@nestjs/common");
const cs_service_1 = require("./cs.service");
const prisma_module_1 = require("../../core/prisma/prisma.module");
const agent_shared_module_1 = require("../../core/agent-shared/agent-shared.module");
let AgentCsModule = class AgentCsModule {
};
exports.AgentCsModule = AgentCsModule;
exports.AgentCsModule = AgentCsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, agent_shared_module_1.AgentSharedModule],
        providers: [cs_service_1.CsService],
        exports: [cs_service_1.CsService],
    })
], AgentCsModule);
//# sourceMappingURL=agent-cs.module.js.map