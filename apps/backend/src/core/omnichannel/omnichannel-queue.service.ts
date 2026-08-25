import { Injectable, Logger } from '@nestjs/common';
import { IncomingMessage } from './interfaces/incoming-message.interface';
import { CsService } from '../../features/agent-cs/cs.service';

@Injectable()
export class OmnichannelQueueService {
  private readonly logger = new Logger(OmnichannelQueueService.name);
  
  private messageBuffer = new Map<string, { 
    texts: string[], 
    timer: NodeJS.Timeout,
    message: IncomingMessage
  }>();

  private processingQueue: IncomingMessage[] = [];
  private isProcessingQueue = false;

  constructor(private readonly csService: CsService) {}

  enqueue(message: IncomingMessage) {
    const { senderId, text, provider } = message;
    const bufferKey = `${provider}_${senderId}`;

    const existing = this.messageBuffer.get(bufferKey);
    if (existing) {
      clearTimeout(existing.timer);
      existing.texts.push(text);
      existing.message.text = existing.texts.join('\n'); // Update combined text
      
      existing.timer = setTimeout(() => {
        const buffered = this.messageBuffer.get(bufferKey);
        if (buffered) {
          this.processingQueue.push(buffered.message);
          this.messageBuffer.delete(bufferKey);
          this.processQueue();
        }
      }, 10000);
    } else {
      this.messageBuffer.set(bufferKey, {
        texts: [text],
        message: { ...message },
        timer: setTimeout(() => {
          const buffered = this.messageBuffer.get(bufferKey);
          if (buffered) {
            this.processingQueue.push(buffered.message);
            this.messageBuffer.delete(bufferKey);
            this.processQueue();
          }
        }, 10000)
      });
    }
  }

  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.processingQueue.length > 0) {
      const task = this.processingQueue.shift();
      if (!task) continue;

      try {
        this.logger.log(`[Omnichannel] Memproses pesan dari ${task.senderId} via ${task.provider}`);
        const response = await this.csService.handleMessage(task);
        await task.replyCallback(response);
      } catch (error) {
        this.logger.error(`[Omnichannel] Error memproses pesan dari ${task.senderId}: ${error.message}`);
        try {
            await task.replyCallback({ text: 'Maaf, sistem sedang sibuk. Mohon coba beberapa saat lagi.', images: [] });
        } catch(e) {}
      }
    }

    this.isProcessingQueue = false;
  }
}
