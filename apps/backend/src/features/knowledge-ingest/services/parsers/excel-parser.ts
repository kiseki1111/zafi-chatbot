import { Injectable, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { ExtractedProductDto } from '../../dto/extracted-product.dto';
import { AgentSharedService } from '../../../../core/agent-shared/agent-shared.service';

@Injectable()
export class ExcelParser {
  private readonly logger = new Logger(ExcelParser.name);

  constructor(private readonly agentSharedService: AgentSharedService) {}

  async parseBuffer(buffer: Buffer): Promise<ExtractedProductDto[]> {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const extracted: ExtractedProductDto[] = [];

    for (const sheetName of workbook.SheetNames) {
      let schemaMapping: any = null;
      let lastProduct: ExtractedProductDto | null = null;
      
      const worksheet = workbook.Sheets[sheetName];
      const rawRows: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rawRows.length === 0) continue;

      // Temukan baris header sebenarnya (baris pertama yang memiliki > 2 kolom berupa string non-kosong)
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
        const obj: any = {};
        headers.forEach((header, idx) => {
          if (header) obj[header] = row[idx];
        });
        return obj;
      }).filter(obj => Object.keys(obj).length > 0);

      if (data.length === 0) continue;

      // LLM Schema Inference (only run once per workbook/sheet if not already inferred)
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
        } catch (e) {
          this.logger.warn(`[EXCEL-PARSER] Gagal melakukan Schema Inference, fallback ke hardcode: ${e.message}`);
          // Fallback manual
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
        // Ekstraksi nilai dengan mencoba menggunakan mapping dari AI, jika kosong gunakan fallback hardcode dari properti yang ada.
        const extractVal = (key: string, fallbacks: string[]) => {
          if (schemaMapping && schemaMapping[key] && row[schemaMapping[key]] !== undefined) {
            return row[schemaMapping[key]];
          }
          for (const fallback of fallbacks) {
            if (row[fallback] !== undefined) return row[fallback];
          }
          return '';
        };

        const nama = extractVal('nama_produk_key', ['nama', 'name', 'produk', 'Nama Produk', 'Nama', 'Name']);
        const rawHarga = extractVal('harga_key', ['harga', 'price', 'Harga (Rp)', 'Harga', 'Price', 'Harga Jual']);
        const deskripsi = extractVal('deskripsi_key', ['deskripsi', 'description', 'keterangan', 'Deskripsi']);
        const kategori = extractVal('kategori_key', ['kategori', 'category', 'Kategori']);
        const size = extractVal('varian_key', ['size', 'ukuran', 'Size', 'Ukuran', 'Varian', 'variant']);
        const stok = extractVal('stok_key', ['stok', 'stock', 'Stok (pcs)', 'Stok', 'Qty']);
        
        const harga = parseFloat(String(rawHarga || 0).replace(/[^0-9.-]+/g,"")) || 0;

        if (nama && String(nama).trim() !== '') {
          // Baris ini adalah produk baru
          lastProduct = {
            nama,
            harga,
            deskripsi,
            attributes: {}
          };
          if (kategori) lastProduct.attributes!.kategori = kategori;
          
          if (size !== '') {
            lastProduct.attributes!.variants = { [String(size)]: parseInt(stok) || 0 };
          }
          extracted.push(lastProduct);
        } else if (lastProduct) {
          // Baris ini adalah lanjutan dari produk sebelumnya (Varian/Size lain)
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
}
