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
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const rag_service_1 = require("../knowledge/rag.service");
const openai_module_1 = require("../../infrastructure/openai/openai.module");
let AiService = AiService_1 = class AiService {
    configService;
    ragService;
    injectedOpenai;
    openai;
    logger = new common_1.Logger(AiService_1.name);
    constructor(configService, ragService, injectedOpenai) {
        this.configService = configService;
        this.ragService = ragService;
        this.injectedOpenai = injectedOpenai;
        this.openai = this.injectedOpenai;
    }
    async generateBrainstormResponse(prompt, context) {
        if (!this.openai) {
            throw new common_1.InternalServerErrorException('OPENAI_API_KEY is not configured');
        }
        try {
            let finalPrompt = prompt;
            if (context) {
                finalPrompt = `Context:\n${context}\n\nTask:\n${prompt}`;
            }
            const instructions = `You are an AI property assistant called PropertiKu. The user is asking for brainstorming ideas for social media (e.g. TikTok angles, Instagram scripts) for real estate marketing. 
Provide a clear, engaging response. 
Format your ideas clearly using markdown. Make sure to respond in Indonesian language.`;
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: instructions },
                    { role: 'user', content: finalPrompt }
                ]
            });
            return response.choices[0].message?.content || '';
        }
        catch (error) {
            console.error('Error in AI Service:', error);
            throw new common_1.InternalServerErrorException('Failed to generate response from OpenAI');
        }
    }
    async generateImagePrompt(prompt, style) {
        if (!this.openai) {
            throw new common_1.InternalServerErrorException('OPENAI_API_KEY is not configured');
        }
        try {
            const instructions = `You are an expert AI image prompt engineer. The user will provide a simple idea in Indonesian, and a desired style.
Your task is to translate their idea into English and expand it into a highly detailed, vivid, and highly optimized image generation prompt.
Only return the prompt text. Do not add any conversational filler.
Example style additions: 
- "Realistis": photorealistic, 8k resolution, highly detailed, professional photography, cinematic lighting
- "Ilustrasi 3D": 3d render, octane render, unreal engine 5, cute, pixar style
- "Sketsa": architectural sketch, pencil drawing, blueprint style, hand drawn

User Prompt: ${prompt}
Requested Style: ${style}
Output strictly just the English prompt:`;
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'user', content: instructions }
                ]
            });
            return response.choices[0].message?.content?.trim() || '';
        }
        catch (error) {
            console.error('Error generating image prompt:', error);
            throw new common_1.InternalServerErrorException('Failed to generate image prompt from OpenAI');
        }
    }
    async rewriteQueryAndDetectIntent(message, chatHistory) {
        const recentHistory = chatHistory && chatHistory.length > 0
            ? chatHistory.slice(-4).map(h => `${h.senderType === 'bot' ? 'CS' : 'User'}: ${h.content}`).join('\n')
            : 'No history yet.';
        const prompt = `You are a query analyzer.
1. Rephrase the user's Follow-up Question into a standalone question using the Conversation History. If no history, just return the question as is or slightly cleaned up.
2. Determine if the user's intent is to list, see, or ask for ALL available products/houses/options (e.g. "ada rumah apa aja?", "daftar harga", "kirimkan list perumahan", "sebutkan semua produk").
Respond ONLY in valid JSON format:
{
  "standaloneQuery": "string",
  "isCatalogRequest": boolean
}

Conversation History:
${recentHistory}

Follow-up Question: ${message}`;
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
                response_format: { type: 'json_object' }
            });
            const resJson = JSON.parse(response.choices[0].message?.content || '{}');
            return {
                standaloneQuery: resJson.standaloneQuery || message,
                isCatalogRequest: !!resJson.isCatalogRequest
            };
        }
        catch (e) {
            this.logger.error('Error rewriting query for RAG: ' + e.message);
            return { standaloneQuery: message, isCatalogRequest: false };
        }
    }
    async detectTopLevelIntent(message) {
        if (!this.openai)
            return 'CS';
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('poster') || lowerMsg.includes('gambar') || lowerMsg.includes('desain') || lowerMsg.includes('design') || lowerMsg.includes('bikin brosur') || lowerMsg.includes('edit')) {
            return 'DESIGN';
        }
        const prompt = `You are an intent router for a property company's Omnichannel Bot.
The user sent a message: "${message}"

Classify their intent into exactly ONE of the following categories:
- DESIGN: If the user is asking to create, make, generate, or design an image, poster, brochure, or graphic.
- CS: For all other requests (asking for house prices, catalog, location, general questions, or chatting).

Respond with ONLY the category word: DESIGN or CS.`;
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
                max_tokens: 5
            });
            const intent = response.choices[0].message?.content?.trim().toUpperCase();
            return intent === 'DESIGN' ? 'DESIGN' : 'CS';
        }
        catch (e) {
            return 'CS';
        }
    }
    async generateLunaResponse(message, senderNumber, chatHistory = [], tenantId) {
        if (!this.openai) {
            throw new common_1.InternalServerErrorException('OPENAI_API_KEY is not configured');
        }
        try {
            const { standaloneQuery, isCatalogRequest } = await this.rewriteQueryAndDetectIntent(message, chatHistory);
            this.logger.log(`[RAG Intent Routing] Standalone: "${standaloneQuery}" | isCatalog: ${isCatalogRequest}`);
            let context = '';
            if (isCatalogRequest) {
                context = await this.ragService.getCatalogContext(tenantId);
            }
            else {
                context = await this.ragService.searchRelevantContext(standaloneQuery, 10, tenantId);
            }
            let systemPrompt = `Anda adalah Customer Service dari Zafi Property, sebuah perusahaan konstruksi dan properti terkemuka. Tugas Anda adalah merespon pertanyaan pelanggan (kebanyakan Bapak/Ibu/Kakak) terkait produk dan properti yang kami jual dengan ramah dan profesional.
Berikan jawaban yang ramah, hangat, dan luwes seperti manusia sungguhan (CS profesional). Hindari bahasa kaku atau gaya bahasa robotik/AI. Gunakan bahasa Indonesia sehari-hari yang sopan. Fokus utama Anda adalah memberikan informasi yang akurat berdasarkan database.

ATURAN PENTING FORMATTING & KOMUNIKASI:
1. JANGAN menggunakan simbol formatting Markdown (JANGAN gunakan *, **, _, dll). Balas dengan teks biasa murni.
2. Gunakan emoji (emote) secara natural dan relevan dengan isi obrolan (misal: 🏠 untuk rumah, 😊/🙏 untuk sapaan, 📝 untuk info, dll). Jangan berlebihan, tapi pastikan percakapan terasa hidup dan ramah seperti CS manusia.
3. PEMAHAMAN BAHASA LOKAL (MELAYU PONTIANAK): Pelanggan kami berasal dari area Pontianak dan sekitarnya. Mereka mungkin menggunakan bahasa Melayu Pontianak, singkatan, atau bahasa daerah (contoh: "tk pham" = tidak paham, "ndak" = tidak, "kamek" = saya, "kitak" = kamu, "aok" = iya, "brp" = berapa). Harap pahami maksud dari dialek/singkatan tersebut dengan cerdas. Tetap balas dengan bahasa Indonesia yang ramah, santai, dan mudah dimengerti, serta jelaskan dengan sabar jika pelanggan bingung (misalnya tidak tahu apa itu "Blok A" atau "Blok B").

ATURAN PERTANYAAN DI LUAR DATABASE / SURVEI / FOTO RUMAH CONTOH:
Jika pelanggan melakukan salah satu dari hal berikut:
1. Ingin melakukan survei lokasi.
2. Meminta foto rumah contoh (yang tidak ada di daftar gambar Anda).
3. Mengajukan pertanyaan yang jawabannya BENAR-BENAR TIDAK ADA di dalam database (di luar konteks).

Maka Anda WAJIB memberikan respons standar seperti ini (sesuaikan bahasanya agar luwes):
"Untuk pertanyaan ini / Untuk hal tersebut, Bapak/Ibu mungkin bisa langsung menghubungi tim marketing kami ya, nomornya adalah 0812-3456-7890" 
(Catatan: Anda tidak perlu menebak jawaban atau memberikan opsi lain jika memang di luar database).

ATURAN PENGIRIMAN FOTO/GAMBAR:
Jika pelanggan meminta foto properti, ikuti aturan ketat ini:
1. DILARANG KERAS membuat daftar angka (1, 2, 3) atau bullet point.
2. DILARANG KERAS menuliskan nama-nama perumahan di dalam kalimat Anda.
3. CUKUP berikan 1 kalimat pengantar pendek saja.
4. Langsung tempelkan format [GAMBAR] di bawahnya, tanpa tambahan titik dua (:) atau angka.

Contoh BENAR:
Ini foto-fotonya ya Kak:
[GAMBAR: Zafi Residence] https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Zafi%20Residence/Zafi%20Residence.png

DAFTAR URL GAMBAR RESMI (hanya gunakan yang ada di daftar ini):
- Zafi Residence: https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Zafi%20Residence/Zafi%20Residence.png
- Griya Amanah 2 (Tipe 40 & 45): https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Griya%20Amanah%202/Griya%20Amanah%20Type%2040%20%26%2045.png
- Griya Amanah 2 (Rumah Type 36): https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Griya%20Amanah%202/Rumah%20Type%2036%20Griya2.png
- Kahyana Residence: https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Kahyana%20Residence/Kahyana%20Residence.png
- Seven Residence: https://bzexgkcgpzxqtbfixatj.supabase.co/storage/v1/object/public/gambar_produk_zafi/Seven%20Residence/Seven%20Residence.png

DAFTAR GOOGLE MAPS LOKASI PROPERTI (Jika menanyakan alamat, WAJIB berikan alamat lengkap dalam bentuk teks berdasarkan database/pengetahuan Anda, LALU sertakan link Google Maps berikut):
- Kantor Pusat Zafi Property: https://maps.app.goo.gl/WWd7hsTxrBrXMUo18 (Alamat teks: Jl. Ayani - Jl. Parit Sembin, Kabupaten Kubu Raya)
- Zafi Residence: https://maps.app.goo.gl/aP3ybdjSmnptnR9LA
- Griya Amanah 2 (Semua tipe berada di satu lokasi yang sama): https://maps.app.goo.gl/quU9dEZsEQSaiPUn7
- Kahyana Residence: https://maps.app.goo.gl/eszQ1TgMVRJRTpZ59
- Seven Residence: https://maps.app.goo.gl/GEigf4YYsgRTYqzi6

LARANGAN KERAS:
1. JANGAN PERNAH mengarang URL sendiri atau menggunakan placeholder seperti example.com. HANYA gunakan URL dari daftar di atas.
2. JANGAN membungkus URL dengan Markdown seperti [teks](URL). Tuliskan URL mentah apa adanya.
3. JANGAN menyuruh pelanggan mengklik link. Cukup katakan: "Ini fotonya ya Kak, silakan dilihat-lihat".

PASTIKAN rincian rumah (seperti Tipe, Harga, Luas) dibuat rapi berjejer ke bawah agar enak dibaca di layar HP!`;
            if (context) {
                systemPrompt += `\n\nGunakan informasi berikut secara eksklusif:\n\n=== INFORMASI PERUSAHAAN ===\n${context}\n===========================`;
            }
            else {
                systemPrompt += `\n\nSaat ini belum ada informasi relevan di database. Jawab secara umum atau tolak dengan sopan.`;
            }
            const messages = [
                { role: 'system', content: systemPrompt }
            ];
            for (const msg of chatHistory) {
                if (msg.content) {
                    messages.push({
                        role: msg.senderType === 'bot' ? 'assistant' : 'user',
                        content: msg.content
                    });
                }
            }
            messages.push({ role: 'user', content: message });
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini-2024-07-18',
                messages: messages,
                temperature: 0.7,
            });
            const responseMessage = response.choices[0].message;
            let finalContent = responseMessage.content || '';
            finalContent = finalContent.replace(/[*~`#]/g, '');
            return finalContent || 'Maaf, saya sedang tidak bisa merespons saat ini.';
        }
        catch (error) {
            console.error('Error in Luna AI:', error);
            throw new common_1.InternalServerErrorException('Failed to generate response from Luna AI');
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => rag_service_1.RagService))),
    __param(2, (0, common_1.Inject)(openai_module_1.OPENAI_CLIENT)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        rag_service_1.RagService, Object])
], AiService);
//# sourceMappingURL=ai.service.js.map