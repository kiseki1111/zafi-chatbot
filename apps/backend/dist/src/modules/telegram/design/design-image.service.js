"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DesignImageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignImageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importStar(require("openai"));
const stream_1 = require("stream");
let DesignImageService = DesignImageService_1 = class DesignImageService {
    configService;
    logger = new common_1.Logger(DesignImageService_1.name);
    openaiImage;
    openaiChat;
    constructor(configService) {
        this.configService = configService;
        const imageKey = this.configService.get('OPENAI_IMAGE_KEY') ||
            this.configService.get('OPENAI_API_KEY');
        const chatKey = this.configService.get('OPENAI_API_KEY');
        this.openaiImage = new openai_1.default({ apiKey: imageKey });
        this.openaiChat = new openai_1.default({ apiKey: chatKey });
    }
    base64ToReadable(base64String) {
        const buffer = Buffer.from(base64String, 'base64');
        const readable = new stream_1.Readable();
        readable.push(buffer);
        readable.push(null);
        return readable;
    }
    base64ToBuffer(base64String) {
        return Buffer.from(base64String, 'base64');
    }
    async generate(prompt, size = '1024x1792') {
        try {
            const response = await this.openaiImage.images.generate({
                model: 'gpt-image-2',
                prompt,
                n: 1,
                size: size,
            });
            const data = response.data?.[0];
            if (!data)
                throw new Error('No image returned from OpenAI API');
            let base64;
            if (data.b64_json) {
                base64 = data.b64_json;
            }
            else if (data.url) {
                const imageResponse = await fetch(data.url);
                const arrayBuffer = await imageResponse.arrayBuffer();
                base64 = Buffer.from(arrayBuffer).toString('base64');
            }
            else {
                throw new Error('Format gambar tidak dikenali dari API OpenAI');
            }
            return { success: true, imageBase64: base64 };
        }
        catch (error) {
            this.logger.error('Image generation error:', error);
            return { success: false, error: error.message };
        }
    }
    async generateWithReference(base64Aset, base64Referensi, instruksiTambahan = '', size = '1024x1536') {
        try {
            this.logger.log('[1/2] GPT-4o menganalisis kedua gambar...');
            const analisis = await this.openaiChat.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `You are an expert graphic designer and prompt engineer.
You will receive TWO images:
- IMAGE A (aset): The source photo — a house/property photo that will become the hero image of the poster.
- IMAGE B (referensi): A finished promotional poster — this is the design template to replicate.

Your job is to write ONE highly detailed image generation prompt in English that:

1. LAYOUT (from IMAGE B):
   - Describe the exact poster layout zones (top header area, main photo placement, text overlay areas, bottom price band, etc.)
   - Mention the exact color of each zone (provide hex-like descriptions: "deep navy blue #1a2744", "warm cream #f5f0e8")
   - Describe the diagonal or geometric shape separating sections if any
   - Describe background color and texture

2. TYPOGRAPHY (from IMAGE B):
   - Describe every text element: position, size (large/medium/small), weight (bold/thin), style (italic/script/sans-serif), and color
   - Include ALL actual text labels that should appear (in Indonesian, as in the reference)

3. BADGES & DECORATIVE ELEMENTS (from IMAGE B):
   - Describe all badges, icons, circles, or call-out elements with their position, shape, color, and text content
   - Describe icon styles (line icons, filled, etc.)

4. HERO IMAGE (from IMAGE A):
   - Describe the house/property from IMAGE A accurately: color, roof style, architecture style, number of floors, landscaping
   - Specify where it should be placed in the poster (full-width center, slightly left-aligned, etc.)
   - Mention it should keep the realistic photo style

5. ADDITIONAL INSTRUCTION:
   - ${instruksiTambahan}

Write the prompt as a single cohesive paragraph or structured prompt — NOT as bullet points.
The prompt must be specific enough that an AI image generator can reproduce a layout nearly identical to IMAGE B but using the house from IMAGE A.
Respond in English only.`,
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/png;base64,${base64Aset}`,
                                    detail: 'high',
                                },
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/png;base64,${base64Referensi}`,
                                    detail: 'high',
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 1500,
            });
            const promptUltraDetail = analisis.choices[0].message.content;
            this.logger.log('[1/2] GPT-4o prompt berhasil dihasilkan');
            this.logger.log('[2/2] Generating poster dengan gpt-image-2...');
            const asetStream = this.base64ToReadable(base64Aset);
            const asetFile = await (0, openai_1.toFile)(asetStream, 'aset.png', { type: 'image/png' });
            const response = await this.openaiImage.images.edit({
                model: 'gpt-image-2',
                image: asetFile,
                prompt: promptUltraDetail,
                size: size,
                quality: 'medium',
            });
            const data = response.data?.[0];
            if (!data)
                throw new Error('No image returned from OpenAI API');
            let base64Result;
            if (data.b64_json) {
                base64Result = data.b64_json;
            }
            else if (data.url) {
                const imageResponse = await fetch(data.url);
                const arrayBuffer = await imageResponse.arrayBuffer();
                base64Result = Buffer.from(arrayBuffer).toString('base64');
            }
            else {
                throw new Error('Format gambar tidak dikenali dari API OpenAI');
            }
            this.logger.log('[2/2] Poster berhasil digenerate!');
            return {
                success: true,
                imageBase64: base64Result,
                generatedPrompt: promptUltraDetail,
            };
        }
        catch (error) {
            this.logger.error('generateWithReference error:', error);
            return { success: false, error: error.message };
        }
    }
};
exports.DesignImageService = DesignImageService;
exports.DesignImageService = DesignImageService = DesignImageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DesignImageService);
//# sourceMappingURL=design-image.service.js.map