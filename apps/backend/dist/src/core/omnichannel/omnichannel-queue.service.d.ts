import { IncomingMessage } from './interfaces/incoming-message.interface';
import { CsService } from '../../features/agent-cs/cs.service';
export declare class OmnichannelQueueService {
    private readonly csService;
    private readonly logger;
    private messageBuffer;
    private processingQueue;
    private isProcessingQueue;
    constructor(csService: CsService);
    enqueue(message: IncomingMessage): void;
    private processQueue;
}
