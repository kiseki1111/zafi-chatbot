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

}
