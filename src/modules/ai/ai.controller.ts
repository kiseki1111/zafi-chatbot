import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('brainstorm')
  @HttpCode(200)
  async brainstorm(@Body('prompt') prompt: string, @Body('context') context: string) {
    const result = await this.aiService.generateBrainstormResponse(prompt, context);
    return { result };
  }

  @Post('generate-image')
  @HttpCode(200)
  async generateImage(@Body('prompt') prompt: string, @Body('style') style: string) {
    const enhancedPrompt = await this.aiService.generateImagePrompt(prompt, style);
    // Use pollinations.ai for the actual image rendering based on Gemini's prompt
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true`;
    return { imageUrl, enhancedPrompt };
  }
}
