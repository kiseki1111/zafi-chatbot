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
}
