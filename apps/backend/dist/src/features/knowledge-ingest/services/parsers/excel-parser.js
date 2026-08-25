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
var ExcelParser_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelParser = void 0;
const common_1 = require("@nestjs/common");
const xlsx = __importStar(require("xlsx"));
const agent_shared_service_1 = require("../../../../core/agent-shared/agent-shared.service");
let ExcelParser = ExcelParser_1 = class ExcelParser {
    agentSharedService;
    logger = new common_1.Logger(ExcelParser_1.name);
    constructor(agentSharedService) {
        this.agentSharedService = agentSharedService;
    }
    async parseBuffer(buffer) {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const extracted = [];
        for (const sheetName of workbook.SheetNames) {
            let schemaMapping = null;
            let lastProduct = null;
            const worksheet = workbook.Sheets[sheetName];
            const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
            if (rawRows.length === 0)
                continue;
            let headerRowIdx = 0;
            for (let i = 0; i < Math.min(10, rawRows.length); i++) {
                const row = rawRows[i];
                if (Array.isArray(row)) {
                    const stringCols = row.filter(cell => typeof cell === 'string' && cell.trim().length > 0);
                    if (stringCols.length >= 2) {
                        headerRowIdx = i;
                        break;
                    }
                }
            }
            const headers = rawRows[headerRowIdx] || [];
            const data = rawRows.slice(headerRowIdx + 1).map(row => {
                const obj = {};
                headers.forEach((header, idx) => {
                    if (header)
                        obj[header] = row[idx];
                });
                return obj;
            }).filter(obj => Object.keys(obj).length > 0);
            if (data.length === 0)
                continue;
            if (!schemaMapping) {
                const sampleData = data.slice(0, 5);
                this.logger.log(`[EXCEL-PARSER] Mengirim 5 baris sampel ke LLM untuk Schema Inference...`);
                const systemPrompt = `Anda adalah ahli pemroses data (Data Parser).
Tugas Anda: Menganalisa struktur JSON dari baris sampel data Excel berikut dan mengembalikan pemetaan (mapping) nama properti/kolom yang tepat.
Kami membutuhkan 6 informasi utama (jika tersedia di data):
1. nama_produk_key: Kunci untuk Nama Produk/Barang
2. harga_key: Kunci untuk Harga
3. deskripsi_key: Kunci untuk Deskripsi/Keterangan
4. kategori_key: Kunci untuk Kategori
5. varian_key: Kunci untuk Varian (misal: Size, Ukuran, Warna, dll)
6. stok_key: Kunci untuk Stok/Jumlah (misal: Stok, Qty, Sisa)

Jika salah satu dari data di atas tidak ditemukan di sampel (misalnya tidak ada kolom kategori atau deskripsi), isikan nilainya dengan string kosong "".
Format balasan Anda HARUS valid JSON. Hanya kembalikan objek JSON!`;
                const userPrompt = `Sampel data: \n${JSON.stringify(sampleData, null, 2)}`;
                try {
                    const aiResponse = await this.agentSharedService.callLLM(userPrompt, systemPrompt, true);
                    schemaMapping = JSON.parse(aiResponse);
                    this.logger.log(`[EXCEL-PARSER] Hasil Schema Inference: ${JSON.stringify(schemaMapping)}`);
                }
                catch (e) {
                    this.logger.warn(`[EXCEL-PARSER] Gagal melakukan Schema Inference, fallback ke hardcode: ${e.message}`);
                    schemaMapping = {
                        nama_produk_key: 'nama',
                        harga_key: 'harga',
                        deskripsi_key: 'deskripsi',
                        kategori_key: 'kategori',
                        varian_key: 'size',
                        stok_key: 'stok'
                    };
                }
            }
            for (const row of data) {
                const extractVal = (key, fallbacks) => {
                    if (schemaMapping && schemaMapping[key] && row[schemaMapping[key]] !== undefined) {
                        return row[schemaMapping[key]];
                    }
                    for (const fallback of fallbacks) {
                        if (row[fallback] !== undefined)
                            return row[fallback];
                    }
                    return '';
                };
                const nama = extractVal('nama_produk_key', ['nama', 'name', 'produk', 'Nama Produk', 'Nama', 'Name']);
                const rawHarga = extractVal('harga_key', ['harga', 'price', 'Harga (Rp)', 'Harga', 'Price', 'Harga Jual']);
                const deskripsi = extractVal('deskripsi_key', ['deskripsi', 'description', 'keterangan', 'Deskripsi']);
                const kategori = extractVal('kategori_key', ['kategori', 'category', 'Kategori']);
                const size = extractVal('varian_key', ['size', 'ukuran', 'Size', 'Ukuran', 'Varian', 'variant']);
                const stok = extractVal('stok_key', ['stok', 'stock', 'Stok (pcs)', 'Stok', 'Qty']);
                const harga = parseFloat(String(rawHarga || 0).replace(/[^0-9.-]+/g, "")) || 0;
                if (nama && String(nama).trim() !== '') {
                    lastProduct = {
                        nama,
                        harga,
                        deskripsi,
                        attributes: {}
                    };
                    if (kategori)
                        lastProduct.attributes.kategori = kategori;
                    if (size !== '') {
                        lastProduct.attributes.variants = { [String(size)]: parseInt(stok) || 0 };
                    }
                    extracted.push(lastProduct);
                }
                else if (lastProduct) {
                    if (!lastProduct.attributes) {
                        lastProduct.attributes = {};
                    }
                    if (size !== '') {
                        if (!lastProduct.attributes.variants) {
                            lastProduct.attributes.variants = {};
                        }
                        lastProduct.attributes.variants[String(size)] = parseInt(stok) || 0;
                    }
                }
            }
        }
        return extracted;
    }
};
exports.ExcelParser = ExcelParser;
exports.ExcelParser = ExcelParser = ExcelParser_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_shared_service_1.AgentSharedService])
], ExcelParser);
//# sourceMappingURL=excel-parser.js.map