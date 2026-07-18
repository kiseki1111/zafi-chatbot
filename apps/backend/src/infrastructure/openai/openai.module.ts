import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';

export const OPENAI_CLIENT = 'OPENAI_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: OPENAI_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const openaiApiKey = configService.get<string>('CHATGPT_API_KEY') || configService.get<string>('OPENAI_API_KEY');
        const openaiBaseUrl = configService.get<string>('OPENAI_BASE_URL');
        
        if (!openaiApiKey) {
          // It's better to not throw here to allow app to start without AI
          console.warn('OpenAI API Key is not configured. AI features will not work.');
          return null;
        }

        return new OpenAI({
          apiKey: openaiApiKey,
          baseURL: openaiBaseUrl || undefined,
        });
      },
    },
  ],
  exports: [OPENAI_CLIENT],
})
export class OpenAiModule {}
