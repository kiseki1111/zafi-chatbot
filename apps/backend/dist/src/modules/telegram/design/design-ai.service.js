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
var DesignAiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignAiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importDefault(require("openai"));
let DesignAiService = DesignAiService_1 = class DesignAiService {
    configService;
    logger = new common_1.Logger(DesignAiService_1.name);
    openai;
    constructor(configService) {
        this.configService = configService;
        const apiKey = this.configService.get('OPENAI_API_KEY');
        this.openai = new openai_1.default({ apiKey });
    }
    async summarizePrompt(userPrompt, previousSummary = null) {
        try {
            const messages = [
                {
                    role: 'system',
                    content: 'Anda adalah asisten desainer grafis AI profesional kelas dunia (ahli desain ala Canva/Photoshop). Tugas Anda adalah merangkum permintaan user untuk membuat POSTER PROMOSI / DESAIN GRAFIS yang sangat modern, elegan, dan profesional.\n\nBerikan output HANYA dalam format JSON dengan struktur berikut:\n{\n  "summary_id": "kesimpulan detail dalam bahasa Indonesia untuk dibaca user (jelaskan elemen visual, komposisi layout, tipografi, dan gaya desainnya)",\n  "english_prompt": "prompt image generation yang SANGAT SPESIFIK dalam bahasa Inggris. WAJIB menyertakan kata kunci seperti: \\"Professional Canva style promotional poster, modern graphic design, elegant layout, bold typography, info badges, text overlays, high-end architectural rendering background\\". Jelaskan warna, penempatan teks, lencana fitur (badges), dan estetika visual agar hasilnya seperti template Canva premium! PENTING: Jika user meminta teks tertentu (misal: \\"Seharga 3 Juta\\"), tulis persis dalam bahasa Indonesia di dalam tanda kutip pada prompt Inggris ini, contoh: with bold text \\"Seharga 3 Juta\\".",\n  "image_size": "Tentukan orientasi optimal berdasarkan permintaan user. Pilih salah satu persis: \'1024x1024\' (persegi), \'1024x1792\' (potret/vertikal), atau \'1792x1024\' (lanskap/horizontal). Jika tidak disebutkan, asumsikan potret \'1024x1792\' untuk poster."\n}',
                },
            ];
            if (previousSummary) {
                messages.push({
                    role: 'user',
                    content: `Ini kesimpulan sebelumnya:\n${previousSummary}\n\nRevisi kesimpulan tersebut berdasarkan instruksi berikut: ${userPrompt}`,
                });
            }
            else {
                messages.push({ role: 'user', content: userPrompt });
            }
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                response_format: { type: 'json_object' },
                messages,
            });
            return JSON.parse(response.choices[0].message.content);
        }
        catch (error) {
            this.logger.error('summarizePrompt error:', error);
            return null;
        }
    }
    async analyzeMultipleImagesAndSummarize(existingSummary, imagesBase64Array, userNotes) {
        try {
            const hasImages = imagesBase64Array && imagesBase64Array.length > 0;
            const content = [
                {
                    type: 'text',
                    text: `Ini adalah kesimpulan desain saat ini (mungkin berupa JSON atau teks biasa):\n\n${typeof existingSummary === 'string'
                        ? existingSummary
                        : JSON.stringify(existingSummary)}\n\n${hasImages ? 'Dan berikut adalah kumpulan gambar referensi dari user.' : ''}\nTambahan catatan referensi dari user: "${userNotes}"\n\nTolong analisis referensi ini dan buatkan kesimpulan desain yang baru (format JSON).`,
                },
            ];
            if (hasImages) {
                for (const imgBase64 of imagesBase64Array) {
                    content.push({
                        type: 'image_url',
                        image_url: { url: `data:image/jpeg;base64,${imgBase64}` },
                    });
                }
            }
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'Anda adalah asisten desainer grafis AI kelas dunia (expert template Canva). Tugas Anda adalah memperbarui kesimpulan desain dengan mengadaptasi gaya, layout tata letak, badge fitur, tipografi, dan elemen promosi dari gambar referensi user agar hasil akhirnya se-profesional desain agensi perumahan.\n\nBerikan output HANYA dalam format JSON dengan struktur berikut:\n{\n  "summary_id": "kesimpulan detail dalam bahasa Indonesia untuk dibaca user (fokuskan pada penambahan elemen grafis, badge, teks, dan layout modern)",\n  "english_prompt": "prompt bahasa Inggris lengkap. HARUS menyertakan deskripsi komposisi poster promosi, typography, badges, gaya desain Canva/agensi profesional, teks overlay, dan background high-end. PENTING: Jika user meminta tulisan/teks spesifik berbahasa Indonesia, WAJIB tuliskan persis di dalam tanda kutip, contoh: with elegant text \\"Perumahan KPR Subsidi\\".",\n  "image_size": "Tentukan orientasi optimal berdasarkan referensi/catatan user. Pilih salah satu: \'1024x1024\', \'1024x1792\' (potret), atau \'1792x1024\' (lanskap). Jika tidak disebutkan, gunakan \'1024x1792\' untuk poster."\n}',
                    },
                    { role: 'user', content },
                ],
                max_tokens: 1500,
            });
            return JSON.parse(response.choices[0].message.content);
        }
        catch (error) {
            this.logger.error('analyzeMultipleImagesAndSummarize error:', error);
            return null;
        }
    }
    async analyzeRevision(lastImageUrl, newReferencesBase64Array, userRequest) {
        try {
            let imageABase64 = lastImageUrl;
            if (lastImageUrl && lastImageUrl.startsWith('http')) {
                const response = await fetch(lastImageUrl);
                const buffer = await response.arrayBuffer();
                imageABase64 = Buffer.from(buffer).toString('base64');
            }
            const hasNewReferences = newReferencesBase64Array && newReferencesBase64Array.length > 0;
            const content = [
                {
                    type: 'text',
                    text: `Kamu adalah ahli desain grafis dan spesialis UI/UX promosi kelas dunia (Expert Canva/Photoshop). 
Saya punya ${hasNewReferences ? 1 + newReferencesBase64Array.length + ' gambar' : '1 gambar'}:
- Gambar A (gambar utama yang mau dimodifikasi)
${hasNewReferences ? '- Gambar Referensi Tambahan (gaya/style layout, tipografi, badge yang mau ditiru)\n' : ''}
Kumpulan catatan user: "${userRequest}"

Berikan output HANYA dalam format JSON:
{
  "analysis_a": "deskripsi detail gambar A",
  ${hasNewReferences ? '"analysis_b": "deskripsi detail elemen desain grafis referensi baru",' : ''}
  "combined_prompt": "prompt lengkap (dalam bahasa Inggris). WAJIB MENEKANKAN gaya 'Professional promotional poster, Canva template style, modern typography, elegant real estate badges, aesthetic layout, graphic design UI elements'. PENTING: Jika user meminta teks bahasa Indonesia tertentu, sertakan persis di dalam tanda kutip.",
  "image_size": "Pilih rasio aspek yang cocok: '1024x1024', '1024x1792' (potret), atau '1792x1024' (lanskap)."
}`,
                },
            ];
            if (imageABase64) {
                content.push({
                    type: 'image_url',
                    image_url: { url: `data:image/png;base64,${imageABase64}` },
                });
            }
            if (hasNewReferences) {
                for (const refB64 of newReferencesBase64Array) {
                    content.push({
                        type: 'image_url',
                        image_url: { url: `data:image/jpeg;base64,${refB64}` },
                    });
                }
            }
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                response_format: { type: 'json_object' },
                messages: [{ role: 'user', content }],
                max_tokens: 1500,
            });
            return JSON.parse(response.choices[0].message.content);
        }
        catch (error) {
            this.logger.error('analyzeRevision error:', error);
            return null;
        }
    }
};
exports.DesignAiService = DesignAiService;
exports.DesignAiService = DesignAiService = DesignAiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DesignAiService);
//# sourceMappingURL=design-ai.service.js.map