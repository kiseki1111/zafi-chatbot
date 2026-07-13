import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RagService } from './rag.service';
import axios from 'axios';
import csvParser = require('csv-parser');
import { Readable } from 'stream';
import { google } from 'googleapis';
import * as path from 'path';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private ragService: RagService,
  ) {}

  /**
   * Syncs data from a Google Sheet (must be set to "Anyone with the link can view").
   */
  async syncFromGoogleSheet(): Promise<any> {
    const sheetId = this.configService.get<string>('KNOWLEDGE_SHEET_ID');
    
    if (!sheetId) {
      throw new BadRequestException('KNOWLEDGE_SHEET_ID is not configured in .env');
    }

    this.logger.log(`Starting sync from Google Sheet: ${sheetId}`);

    const sheetNames = ['customer', 'produk', 'dokumen'];
    let syncedCount = 0;

    try {
      // Clear existing knowledge base before syncing
      await this.prisma.knowledgeBase.deleteMany({});

      for (const sheetName of sheetNames) {
        // Use Google Visualization API to export a specific sheet by name to CSV
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
        let response;
        try {
          response = await axios.get(csvUrl, { responseType: 'stream' });
        } catch (err) {
          this.logger.warn(`Could not fetch sheet '${sheetName}'. It might not exist or is empty.`);
          continue; // Skip if this sheet doesn't exist
        }

        const results: any[] = [];
        
        // Parse CSV
        await new Promise((resolve, reject) => {
          response.data
            .pipe(csvParser())
            .on('data', (data: any) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error: any) => reject(error));
        });

        if (results.length === 0) {
          this.logger.warn(`Sheet '${sheetName}' is empty.`);
          continue;
        }

        for (const row of results) {
          // Convert row object into a single string, prepend sheet name as context
          const rowText = Object.entries(row)
            .filter(([_, value]) => value && (value as string).trim() !== '') // Skip empty columns
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');

          if (!rowText) continue;

          // Add sheet name as category prefix to give AI more context
          const finalContext = `[Kategori: ${sheetName.toUpperCase()}] ${rowText}`;

          // Generate embedding
          const embedding = await this.ragService.generateEmbedding(finalContext);
          const embeddingString = `[${embedding.join(',')}]`;

          // Save to Database using Prisma raw query
          await this.prisma.$executeRawUnsafe(`
            INSERT INTO knowledge_base (id, content, embedding, "created_at", "updated_at")
            VALUES (gen_random_uuid(), $1, $2::vector, NOW(), NOW())
          `, finalContext, embeddingString);

          syncedCount++;
        }
      }

      this.logger.log(`Successfully synced ${syncedCount} rows from Google Sheet.`);
      return { success: true, syncedCount };

    } catch (error) {
      this.logger.error(`Error syncing from Google Sheet: ${error.message}`);
      if (error.response && error.response.status === 401 || error.response?.status === 404) {
        throw new BadRequestException('Could not access Google Sheet. Please make sure the sheet is public (Anyone with the link can view) and the ID is correct.');
      }
      throw new InternalServerErrorException('Failed to sync knowledge base.');
    }
  }

  /**
   * Appends a new customer row to the "customer" sheet using Google Sheets API.
   * Requires a Service Account JSON key.
   */
  async appendCustomerToSheet(
    nama: string,
    telepon: string,
    tahapPipeline: string,
    tags: string,
    propertiDiminati: string,
    tglBooking: string,
    progressDp: string,
    statusDp: string,
    pic: string,
    catatan: string
  ): Promise<boolean> {
    const sheetId = this.configService.get<string>('KNOWLEDGE_SHEET_ID');
    
    if (!sheetId) {
      throw new BadRequestException('KNOWLEDGE_SHEET_ID is not configured in .env');
    }

    try {
      // 1. Authenticate with Service Account
      const keyFilePath = path.join(process.cwd(), 'zafi-project-6653fa366ab6.json');
      
      const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // 2. Prepare the row data
      const waktuMasuk = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const rowData = [
        waktuMasuk,             // A: Waktu Masuk
        nama,                   // B: Nama Konsumen
        telepon,                // C: No. Telepon
        tahapPipeline,          // D: Tahap Pipeline
        tags,                   // E: Tags
        propertiDiminati,       // F: Proyek / Unit Diminati
        tglBooking,             // G: Tgl Booking
        progressDp,             // H: Progress DP
        statusDp,               // I: Status Pembayaran DP
        pic,                    // J: PIC / Ditugaskan Ke
        catatan                 // K: Riwayat & Catatan
      ];

      // 3. Fetch existing data to check for duplicates and merge
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'customer!A:K',
      });
      
      const rows = response.data.values || [];
      let existingRowIndex = -1;
      let existingRowData: any[] = [];

      // Find by phone number (Column C / index 2). We loop backwards to update the most recent (bottom) row if duplicates exist.
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i][2] === telepon) {
          existingRowIndex = i;
          existingRowData = rows[i];
          break;
        }
      }

      if (existingRowIndex >= 0) {
        // Merge data: keep existing if new is default/empty
        const mergedData = [
          existingRowData[0] || waktuMasuk, // Waktu Masuk
          (nama !== '-' && nama !== 'Belum diketahui' && nama !== '') ? nama : (existingRowData[1] || nama),
          telepon,
          (tahapPipeline !== '-' && tahapPipeline !== 'Lead' && tahapPipeline !== '') ? tahapPipeline : (existingRowData[3] || tahapPipeline),
          (tags !== '-' && tags !== '') ? tags : (existingRowData[4] || tags),
          (propertiDiminati !== '-' && propertiDiminati !== 'Belum ada' && propertiDiminati !== '') ? propertiDiminati : (existingRowData[5] || propertiDiminati),
          (tglBooking !== '-' && tglBooking !== '') ? tglBooking : (existingRowData[6] || tglBooking),
          (progressDp !== '-' && progressDp !== '') ? progressDp : (existingRowData[7] || progressDp),
          (statusDp !== '-' && statusDp !== '') ? statusDp : (existingRowData[8] || statusDp),
          (pic !== '-' && pic !== '') ? pic : (existingRowData[9] || pic),
          (catatan !== '-' && catatan !== 'Diinput oleh AI (Agent Spreadsheet)' && catatan !== '') ? catatan : (existingRowData[10] || catatan),
        ];

        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `customer!A${existingRowIndex + 1}:K${existingRowIndex + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [mergedData] },
        });
        this.logger.log(`Successfully updated customer ${telepon} in sheet.`);
      } else {
        // Append new row
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: 'customer!A:K',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [rowData] },
        });
        this.logger.log(`Successfully appended customer ${telepon} to sheet.`);
      }
      
      // Auto-sync after adding
      // Note: In production you might want to only sync this specific row or defer syncing to background
      this.syncFromGoogleSheet().catch(e => this.logger.error(`Failed to auto-sync after append: ${e.message}`));
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to append to Google Sheet: ${error.message}`);
      return false;
    }
  }

  /**
   * Syncs property data from a Google Sheet (sheet name: "produk").
   */
  async syncPropertiesFromSheet(): Promise<any> {
    const sheetId = this.configService.get<string>('KNOWLEDGE_SHEET_ID');
    
    if (!sheetId) {
      throw new BadRequestException('KNOWLEDGE_SHEET_ID is not configured in .env');
    }

    this.logger.log(`Starting Property sync from Google Sheet: ${sheetId}`);

    const sheetName = 'produk';
    let syncedCount = 0;

    try {
      // Use Google Visualization API to export a specific sheet by name to CSV
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
      let response;
      try {
        response = await axios.get(csvUrl, { responseType: 'stream' });
      } catch (err) {
        throw new BadRequestException(`Could not fetch sheet '${sheetName}'. It might not exist or is not public.`);
      }

      const results: any[] = [];
      
      // Parse CSV
      await new Promise((resolve, reject) => {
        response.data
          .pipe(csvParser())
          .on('data', (data: any) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', (error: any) => reject(error));
      });

      if (results.length === 0) {
        throw new BadRequestException(`Sheet '${sheetName}' is empty.`);
      }

      // 1. Clear existing properties to ensure 1-way sync from master
      await this.prisma.property.deleteMany({});

      // 2. Map and insert new properties
      for (const row of results) {
        // Handle variations of column headers robustly (case-insensitive and trim)
        const getCol = (possibleNames: string[]): string => {
          const foundKey = Object.keys(row).find(k => possibleNames.includes(k.trim().toLowerCase()));
          return foundKey ? (row[foundKey] || '').trim() : '';
        };

        const nama = getCol(['nama', 'nama perumahan', 'name']);
        if (!nama) continue; // Skip empty rows

        const lokasi = getCol(['lokasi', 'location']);
        const tipe = getCol(['tipe', 'kategori tipe', 'type']);
        
        const rawHargaCash = getCol(['harga cash', 'harga', 'cashprice', 'price']);
        const cashPrice = parseFloat(rawHargaCash.replace(/[^0-9.-]+/g,"")) || 0;
        
        const rawAdminFee = getCol(['admin fee', 'admin']);
        const adminFee = rawAdminFee ? parseFloat(rawAdminFee.replace(/[^0-9.-]+/g,"")) : null;
        
        const rawDp = getCol(['dp', 'down payment']);
        const dp = rawDp ? parseFloat(rawDp.replace(/[^0-9.-]+/g,"")) : null;

        const luasTanah = getCol(['luas tanah', 'luas', 'land area']);
        const listrik = getCol(['listrik', 'electricity']);
        const kamarTidurStr = getCol(['kamar tidur', 'kamar', 'bedrooms']);
        const bedrooms = parseInt(kamarTidurStr) || 0;
        const kamarMandiStr = getCol(['kamar mandi', 'wc', 'bathrooms']);
        const bathrooms = parseInt(kamarMandiStr) || 0;

        const spesifikasi = getCol(['spesifikasi', 'spesifikasi teknis', 'specifications']);
        const fasilitas = getCol(['fasilitas', 'facilities']);
        const infoCicilan = getCol(['info cicilan', 'cicilan', 'installment info']);
        const linkGambar = getCol(['link gambar', 'gambar', 'imageurl', 'image url', 'image']);
        const layoutDenah = getCol(['layout denah', 'denah', 'layout']);

        await this.prisma.property.create({
          data: {
            name: nama,
            location: lokasi,
            type: tipe,
            cashPrice: cashPrice,
            adminFee: adminFee,
            dp: dp,
            landArea: luasTanah,
            electricity: listrik,
            bedrooms: bedrooms,
            bathrooms: bathrooms,
            specifications: spesifikasi,
            facilities: fasilitas,
            installmentInfo: infoCicilan,
            imageUrl: linkGambar,
            layoutDenah: layoutDenah,
          }
        });
        syncedCount++;
      }

      this.logger.log(`Successfully synced ${syncedCount} properties from Google Sheet.`);
      return { success: true, syncedCount };

    } catch (error) {
      this.logger.error(`Error syncing properties from Google Sheet: ${error.message}`);
      if (error.response && error.response.status === 401 || error.response?.status === 404) {
        throw new BadRequestException('Could not access Google Sheet. Please make sure the sheet is public (Anyone with the link can view) and the ID is correct.');
      }
      throw new InternalServerErrorException(error.message || 'Failed to sync properties.');
    }
  }

  /**
   * Exports (Bootstraps) properties from Prisma DB to Google Sheet.
   * This is a reverse-sync to populate an empty sheet.
   */
  async exportPropertiesToSheet(): Promise<any> {
    const sheetId = this.configService.get<string>('KNOWLEDGE_SHEET_ID');
    
    if (!sheetId) {
      throw new BadRequestException('KNOWLEDGE_SHEET_ID is not configured in .env');
    }

    try {
      this.logger.log(`Starting Property export to Google Sheet: ${sheetId}`);
      
      // 1. Authenticate with Service Account
      const keyFilePath = path.join(process.cwd(), 'zafi-project-6653fa366ab6.json');
      
      const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // 2. Fetch properties from DB
      const properties = await this.prisma.property.findMany();
      
      // 3. Prepare Header and Data rows
      const headerRow = [
        'Nama', 'Lokasi', 'Tipe', 'Harga Cash', 'Admin Fee', 'DP', 
        'Luas Tanah', 'Listrik', 'Kamar Tidur', 'Kamar Mandi', 
        'Spesifikasi', 'Fasilitas', 'Info Cicilan', 'Link Gambar'
      ];

      const dataRows = properties.map(p => [
        p.name,
        p.location,
        p.type,
        p.cashPrice,
        p.adminFee || '',
        p.dp || '',
        p.landArea,
        p.electricity,
        p.bedrooms,
        p.bathrooms,
        p.specifications,
        p.facilities,
        p.installmentInfo,
        p.imageUrl || ''
      ]);

      const allRows = [headerRow, ...dataRows];

      // 4. Write to Google Sheet (overwriting existing content in 'produk' sheet)
      // First, clear the sheet to ensure a clean slate
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: 'produk!A:Z',
      });

      // Then, update with new data
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: 'produk!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: allRows },
      });

      // 5. Format the Spreadsheet to look neat (Wrap Text, Bold Header, Freeze Row)
      const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      const produkSheet = spreadsheetInfo.data.sheets?.find(s => s.properties?.title === 'produk');
      const numericSheetId = produkSheet?.properties?.sheetId || 0;

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              // Auto-resize columns
              autoResizeDimensions: {
                dimensions: {
                  sheetId: numericSheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 14,
                }
              }
            },
            {
              // Format Header (Bold, Gray Background, Center)
              repeatCell: {
                range: {
                  sheetId: numericSheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 14,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                    textFormat: { bold: true },
                    horizontalAlignment: 'CENTER',
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
              }
            },
            {
              // Format Data Rows (Wrap Text, Align Top)
              repeatCell: {
                range: {
                  sheetId: numericSheetId,
                  startRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: 14,
                },
                cell: {
                  userEnteredFormat: {
                    wrapStrategy: 'WRAP',
                    verticalAlignment: 'TOP'
                  }
                },
                fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)'
              }
            },
            {
              // Freeze top row
              updateSheetProperties: {
                properties: {
                  sheetId: numericSheetId,
                  gridProperties: { frozenRowCount: 1 }
                },
                fields: 'gridProperties.frozenRowCount'
              }
            }
          ]
        }
      });

      this.logger.log(`Successfully exported and formatted ${properties.length} properties to Google Sheet.`);
      return { success: true, exportedCount: properties.length };
    } catch (error) {
      this.logger.error(`Failed to export properties to Google Sheet: ${error.message}`);
      throw new InternalServerErrorException(`Failed to export properties: ${error.message}`);
    }
  }
}
