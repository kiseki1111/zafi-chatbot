import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';

export const OPENAI_CLIENT = 'OPENAI_CLIENT';
export const OPENAI_MODEL = 'OPENAI_MODEL';
export const EMBEDDING_MODEL = 'EMBEDDING_MODEL';

@Global()
@Module({
  providers: [
    {
      provide: OPENAI_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const openaiApiKey = configService.get<string>('OPENROUTER_API_KEY') 
                          || configService.get<string>('CHATGPT_API_KEY') 
                          || configService.get<string>('OPENAI_API_KEY');
        const openaiBaseUrl = configService.get<string>('OPENAI_BASE_URL') 
                           || (configService.get<string>('OPENROUTER_API_KEY') ? 'https://openrouter.ai/api/v1' : undefined);
        
        if (!openaiApiKey) {
          console.warn('OpenAI/OpenRouter API Key is not configured. AI features will not work.');
          return null;
        }

        console.log(`[OpenAI Module] Using provider: ${openaiBaseUrl ? 'OpenRouter' : 'OpenAI'}`);

        return new OpenAI({
          apiKey: openaiApiKey,
          baseURL: openaiBaseUrl || undefined,
        });
      },
    },
    {
      provide: OPENAI_MODEL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return configService.get<string>('OPENAI_MODEL') || 'deepseek/deepseek-v4-flash-0731';
      },
    },
    {
      provide: EMBEDDING_MODEL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return configService.get<string>('EMBEDDING_MODEL') || 'qwen/qwen3-embedding-8b';
      },
    },
  ],
  exports: [OPENAI_CLIENT, OPENAI_MODEL, EMBEDDING_MODEL],
})
export class OpenAiModule {}
