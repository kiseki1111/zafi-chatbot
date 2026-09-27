import { Injectable, Logger, Global } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface ChatStreamEvent {
  type: 'message' | 'conversation';
  data: {
    conversationId: string;
    instanceName?: string;
    message?: any;
    contact?: any;
  };
}

// ponytail: Broadcast in-memory Subject via SSE.
// Zero dependencies (RxJS sudah bawaan NestJS), bypass proxy websocket handshake complexity.
@Injectable()
export class ChatStreamService {
  private static instance: ChatStreamService;
  private readonly logger = new Logger(ChatStreamService.name);
  private readonly events$ = new Subject<ChatStreamEvent>();

  constructor() {
    ChatStreamService.instance = this;
  }

  static getInstance(): ChatStreamService | null {
    return ChatStreamService.instance || null;
  }

  emit(event: ChatStreamEvent) {
    try {
      this.events$.next(event);
    } catch (e: any) {
      this.logger.warn(`Failed to emit chat stream event: ${e.message}`);
    }
  }

  // Subscribe ke stream berdasarkan conversationId atau seluruh instance
  subscribe(conversationId?: string, instanceName?: string): Observable<MessageEvent> {
    return this.events$.asObservable().pipe(
      filter((e) => {
        if (conversationId && e.data.conversationId !== conversationId) {
          return false;
        }
        if (instanceName && e.data.instanceName && e.data.instanceName !== instanceName) {
          return false;
        }
        return true;
      }),
      map((e) => ({
        data: e,
      } as MessageEvent)),
    );
  }
}
