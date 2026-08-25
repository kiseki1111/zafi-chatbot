"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulatorModule = void 0;
const common_1 = require("@nestjs/common");
const simulator_controller_1 = require("./simulator.controller");
const agent_assistant_module_1 = require("../agent-assistant/agent-assistant.module");
const agent_cs_module_1 = require("../agent-cs/agent-cs.module");
const prisma_module_1 = require("../../core/prisma/prisma.module");
let SimulatorModule = class SimulatorModule {
};
exports.SimulatorModule = SimulatorModule;
exports.SimulatorModule = SimulatorModule = __decorate([
    (0, common_1.Module)({
        imports: [agent_assistant_module_1.AgentAssistantModule, agent_cs_module_1.AgentCsModule, prisma_module_1.PrismaModule],
        controllers: [simulator_controller_1.SimulatorController],
    })
], SimulatorModule);
//# sourceMappingURL=simulator.module.js.map