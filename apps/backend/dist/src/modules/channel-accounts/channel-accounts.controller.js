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
exports.ChannelAccountsController = void 0;
const common_1 = require("@nestjs/common");
const channel_accounts_service_1 = require("./channel-accounts.service");
const create_channel_account_dto_1 = require("./dto/create-channel-account.dto");
const update_channel_account_dto_1 = require("./dto/update-channel-account.dto");
let ChannelAccountsController = class ChannelAccountsController {
    channelAccountsService;
    constructor(channelAccountsService) {
        this.channelAccountsService = channelAccountsService;
    }
    create(createChannelAccountDto) {
        return this.channelAccountsService.create(createChannelAccountDto);
    }
    findAll() {
        return this.channelAccountsService.findAll();
    }
    findOne(id) {
        return this.channelAccountsService.findOne(id);
    }
    update(id, updateChannelAccountDto) {
        return this.channelAccountsService.update(id, updateChannelAccountDto);
    }
    remove(id) {
        return this.channelAccountsService.remove(id);
    }
};
exports.ChannelAccountsController = ChannelAccountsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_channel_account_dto_1.CreateChannelAccountDto]),
    __metadata("design:returntype", void 0)
], ChannelAccountsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ChannelAccountsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChannelAccountsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_channel_account_dto_1.UpdateChannelAccountDto]),
    __metadata("design:returntype", void 0)
], ChannelAccountsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChannelAccountsController.prototype, "remove", null);
exports.ChannelAccountsController = ChannelAccountsController = __decorate([
    (0, common_1.Controller)('api/v1/channel-accounts'),
    __metadata("design:paramtypes", [channel_accounts_service_1.ChannelAccountsService])
], ChannelAccountsController);
//# sourceMappingURL=channel-accounts.controller.js.map