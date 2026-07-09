import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }
  }

  async generateBrainstormResponse(prompt: string, context?: string): Promise<string> {
    if (!this.model) {
      throw new InternalServerErrorException('GEMINI_API_KEY is not configured');
    }

    try {
      let finalPrompt = prompt;
      if (context) {
        finalPrompt = `Context:\n${context}\n\nTask:\n${prompt}`;
      }

      // We instruct the model to respond in a structured way that matches the UI
      const instructions = `You are an AI property assistant called PropertiKu. The user is asking for brainstorming ideas for social media (e.g. TikTok angles, Instagram scripts) for real estate marketing. 
Provide a clear, engaging response. 
Format your ideas clearly using markdown. Make sure to respond in Indonesian language.`;
      
      const response = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: `${instructions}\n\n${finalPrompt}` }] }]
      });
      
      return response.response.text();
    } catch (error) {
      console.error('Error in AI Service:', error);
      throw new InternalServerErrorException('Failed to generate response from Gemini AI');
    }
  }
}
