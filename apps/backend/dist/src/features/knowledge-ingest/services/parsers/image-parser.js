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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ImageParser_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageParser = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importDefault(require("openai"));
const sharp = require('sharp');
let ImageParser = ImageParser_1 = class ImageParser {
    configService;
    logger = new common_1.Logger(ImageParser_1.name);
    openai;
    constructor(configService) {
        this.configService = configService;
        this.openai = new openai_1.default({
            apiKey: this.configService.get('OPENAI_API_KEY'),
        });
    }
    async parseImage(buffer) {
        try {
            const resizedBuffer = await sharp(buffer)
                .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toBuffer();
            const base64Image = resizedBuffer.toString('base64');
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Anda adalah asisten data ekstraksi katalog. Ekstrak daftar produk dan harganya dari gambar ini."
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Tolong ekstrak daftar produk, harga, dan deskripsi dari gambar brosur/katalog ini." },
                            {
                                type: "image_url",
                                image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                            },
                        ],
                    },
                ],
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: "extracted_products",
                        schema: {
                            type: "object",
                            properties: {
                                products: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            nama: { type: "string" },
                                            harga: { type: "number" },
                                            deskripsi: { type: "string" }
                                        },
                                        required: ["nama", "harga", "deskripsi"],
                                        additionalProperties: false
                                    }
                                }
                            },
                            required: ["products"],
                            additionalProperties: false
                        },
                        strict: true
                    }
                }
            });
            const jsonStr = response.choices[0].message.content;
            if (!jsonStr)
                return [];
            const parsed = JSON.parse(jsonStr);
            return parsed.products || [];
        }
        catch (e) {
            this.logger.error(`Gagal ekstrak gambar via AI: ${e.message}`);
            return [];
        }
    }
};
exports.ImageParser = ImageParser;
exports.ImageParser = ImageParser = ImageParser_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ImageParser);
//# sourceMappingURL=image-parser.js.map