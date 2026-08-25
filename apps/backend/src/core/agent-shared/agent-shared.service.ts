import { Injectable, Logger, Inject, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OPENAI_CLIENT } from '../openai/openai.module';
import { OpenAI } from 'openai';

@Injectable()
export class AgentSharedService {
  private readonly logger = new Logger(AgentSharedService.name);
  private openai: OpenAI | null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OPENAI_CLIENT) private readonly injectedOpenai: OpenAI | null,
  ) {
    this.openai = this.injectedOpenai;
  }

  /**
   * 1. Mengambil N chat terakhir untuk short-term memory LLM.
   */
  async getRecentContext(chatId: string, instanceName: string, limit: number = 6) {
    try {
      const messages = await this.prisma.message.findMany({
        where: {
          conversation: {
            contact: { phone: chatId },
            instanceName: instanceName
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return messages.reverse();
    } catch (e) {
      this.logger.error(`Error fetching recent context for ${chatId}: ${e.message}`);
      return [];
    }
  }

  /**
   * 2. Mencari informasi relevan dari vector_knowledge (RAG).
   */
  async retrieveRelevantKnowledge(query: string, tenantId: string): Promise<string> {
    if (!this.openai) {
       return 'Sistem AI sedang tidak tersedia.';
    }

    try {
      // 1. Generate embedding for query
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: 'float',
      });
      const embedding = embeddingResponse.data[0].embedding;
      const vectorString = `[${embedding.join(',')}]`;

      // 2. Search pgvector
      const results = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          content,
          1 - (embedding <=> $1::vector) as similarity
        FROM vector_knowledge
        WHERE tenant_id = $2
        ORDER BY embedding <=> $1::vector
        LIMIT 5
      `, vectorString, tenantId);

      // Filter similarity if needed, e.g., similarity > 0.3
      const filtered = results.filter(r => r.similarity > 0.3);
      
      if (filtered.length === 0) {
        return '';
      }

      return filtered.map(r => r.content).join('\\n\\n');
    } catch (e) {
      this.logger.error(`Error retrieving relevant knowledge: ${e.message}`);
      return '';
    }
  }

  /**
   * 3. Meminta klarifikasi dari user alih-alih berhalusinasi.
   */
  async generateClarification(ambiguousText: string, missingInfo: string[]): Promise<string> {
    const prompt = `User saying: "${ambiguousText}"
We are missing the following information to proceed: ${missingInfo.join(', ')}

Please generate a polite, short, and natural clarification question in Indonesian asking the user to provide the missing information. 
Do not use Markdown. Keep it conversational.`;

    return this.callLLM(prompt, 'You are a helpful customer service assistant.');
  }

  /**
   * 4. Wrapper tunggal untuk memanggil OpenAI.
   */
  async callLLM(prompt: string, systemPrompt: string, requireJson: boolean = false): Promise<string> {
    if (!this.openai) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: requireJson ? { type: 'json_object' } : { type: 'text' }
      });

      return response.choices[0].message?.content || '';
    } catch (error) {
      this.logger.error('Error in LLM call:', error);
      throw new InternalServerErrorException('Failed to generate response from LLM');
    }
  }

  /**
   * 4b. Wrapper untuk memanggil OpenAI secara streaming.
   */
  async callLLMStream(
    prompt: string, 
    systemPrompt: string, 
    requireJson: boolean = false,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    if (!this.openai) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
    }

    try {
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: requireJson ? { type: 'json_object' } : { type: 'text' },
        stream: true
      });

      let fullContent = '';
      for await (const chunk of stream) {
        const textChunk = chunk.choices[0]?.delta?.content || '';
        if (textChunk) {
          fullContent += textChunk;
          onChunk(textChunk);
        }
      }
      return fullContent;
    } catch (error) {
      this.logger.error('Error in LLM stream call:', error);
      throw new InternalServerErrorException('Failed to generate stream response from LLM');
    }
  }

  async analyzeImage(mediaUrl: string, prompt: string = "Deskripsikan apa isi gambar ini dengan singkat dan jelas, fokus pada nama produk, merk, jumlah, atau informasi harga jika ada."): Promise<string> {
    if (!this.openai) return '';
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: mediaUrl } }
            ] as any // type override for openai array content
          }
        ],
        max_tokens: 300,
      });
      return response.choices[0].message?.content || '';
    } catch (e) {
      this.logger.error(`Error analyzing image: ${e}`);
      return '';
    }
  }

  /**
   * 5. Deteksi intent dari ucapan user.
   */
  async detectIntent(userText: string): Promise<string> {
    const systemPrompt = `You are an intent detection engine. 
Classify the user's text into exactly ONE of the following categories:
- DESIGN: user wants to make a poster, brochure, or graphic design.
- INGEST: user wants to save product info, price, or knowledge base.
- CATALOG: user wants to see the list of all products or house types.
- CS: user is asking a general question, asking for a specific price, chatting, or anything else.

Respond with ONLY the category word.`;

    try {
      const result = await this.callLLM(userText, systemPrompt, false);
      const cleanResult = result.trim().toUpperCase();
      if (['DESIGN', 'INGEST', 'CATALOG', 'CS'].includes(cleanResult)) {
        return cleanResult;
      }
      return 'CS'; // Default fallback
    } catch (e) {
      return 'CS'; // Default fallback
    }
  }
}
