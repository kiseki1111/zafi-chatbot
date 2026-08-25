"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WahaModule = void 0;
const common_1 = require("@nestjs/common");
const waha_service_1 = require("./waha.service");
const waha_controller_1 = require("./waha.controller");
const prisma_module_1 = require("../../core/prisma/prisma.module");
const omnichannel_module_1 = require("../../core/omnichannel/omnichannel.module");
let WahaModule = class WahaModule {
};
exports.WahaModule = WahaModule;
exports.WahaModule = WahaModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, omnichannel_module_1.OmnichannelModule],
        providers: [waha_service_1.WahaService],
        controllers: [waha_controller_1.WahaController],
        exports: [waha_service_1.WahaService],
    })
], WahaModule);
//# sourceMappingURL=waha.module.js.map