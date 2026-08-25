import { Injectable } from '@nestjs/common';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';

@Injectable()
export class DocumentParser {
  async parsePdf(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer);
    return data.text;
  }

  async parseDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
}
