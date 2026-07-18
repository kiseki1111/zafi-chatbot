import TelegramBot from 'node-telegram-bot-api';
import { DesignAiService } from './design-ai.service';
import { DesignImageService } from './design-image.service';
import { DesignSessionService } from './design-session.service';
export declare class DesignFlowService {
    private readonly aiService;
    private readonly imageService;
    private readonly sessionService;
    private readonly logger;
    constructor(aiService: DesignAiService, imageService: DesignImageService, sessionService: DesignSessionService);
    generateAndSendImage(bot: TelegramBot, userId: string, session: any): Promise<void>;
    handle(bot: TelegramBot, msg: any): Promise<void>;
}
