"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OmnichannelModule = void 0;
const common_1 = require("@nestjs/common");
const omnichannel_queue_service_1 = require("./omnichannel-queue.service");
const agent_cs_module_1 = require("../../features/agent-cs/agent-cs.module");
let OmnichannelModule = class OmnichannelModule {
};
exports.OmnichannelModule = OmnichannelModule;
exports.OmnichannelModule = OmnichannelModule = __decorate([
    (0, common_1.Module)({
        imports: [agent_cs_module_1.AgentCsModule],
        providers: [omnichannel_queue_service_1.OmnichannelQueueService],
        exports: [omnichannel_queue_service_1.OmnichannelQueueService],
    })
], OmnichannelModule);
//# sourceMappingURL=omnichannel.module.js.map