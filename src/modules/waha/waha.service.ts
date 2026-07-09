import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class WahaService {
  private readonly logger = new Logger(WahaService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.baseUrl = this.configService.get<string>('WAHA_API_URL', 'http://103.30.195.145:3060');
    this.apiKey = this.configService.get<string>('WAHA_API_KEY', 'ZafitechDunia12345#');
  }

  private getHeaders() {
    return {
      'Accept': 'application/json',
      'X-Api-Key': this.apiKey,
    };
  }

  // Helper for random delay (3-7 seconds) to simulate human typing
  private async randomDelay(minMs: number = 3000, maxMs: number = 7000): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    this.logger.log(`Sleeping for ${delay}ms before sending message (Anti-Spam)...`);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async startSession(sessionName: string, webhookUrl?: string, channelAccountId?: string): Promise<any> {
    try {
      if (channelAccountId) {
        await this.prisma.whatsappInstance.upsert({
          where: { instanceName: sessionName },
          update: { channelAccountId },
          create: { instanceName: sessionName, channelAccountId, status: 'STOPPED' }
        });
      }

      const payload: any = { name: sessionName };
      
      if (webhookUrl) {
        let finalWebhookUrl = webhookUrl.trim();
        if (!finalWebhookUrl.endsWith('/api/v1/waha/webhook')) {
           finalWebhookUrl = finalWebhookUrl.replace(/\/$/, '') + '/api/v1/waha/webhook';
        }
        
        payload.config = {
          webhooks: [
            {
              url: finalWebhookUrl,
              events: ['message', 'message.any', 'session.status'],
              retries: {
                delaySeconds: 2,
                attempts: 3,
                policy: 'fixed'
              }
            },
          ],
        };
      }

      // Add NOWEB specific configuration to ensure messages are captured
      payload.config = payload.config || {};
      payload.config.noweb = {
        markOnline: true,
        store: {
          enabled: true,
          fullSync: false // Disable fullSync because personal WA history is too large
        }
      };
      
      // Explicitly disable ignores so that messages are not dropped
      payload.config.ignore = {
        status: false,
        groups: false,
        channels: false,
        broadcast: false
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/sessions/start`,
          payload,
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to start session ${sessionName}`, error.message);
      throw error;
    }
  }

  async getSessions(): Promise<any> {
    try {
      let wahaSessions: any[] = [];
      try {
        const response = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/api/sessions`, {
            headers: this.getHeaders(),
            timeout: 5000,
          }),
        );
        wahaSessions = response.data || [];
      } catch (httpErr) {
        this.logger.warn(`WAHA API is unreachable: ${httpErr.message}. Falling back to database records.`);
      }
      
      const mergedSessions = await Promise.all(wahaSessions.map(async (ws) => {
         const instance = await this.prisma.whatsappInstance.upsert({
           where: { instanceName: ws.name },
           update: {
              status: ws.status,
              phone: ws.me?.id,
              profileName: ws.me?.pushName,
           },
           create: {
              instanceName: ws.name,
              status: ws.status,
              phone: ws.me?.id,
              profileName: ws.me?.pushName,
           }
         });
         return { ...ws, dbStats: instance };
      }));

      // Find offline instances
      const activeNames = wahaSessions.map((s: any) => s.name);
      const offlineInstances = await this.prisma.whatsappInstance.findMany({
         where: { instanceName: { notIn: activeNames } }
      });
      
      for(const offline of offlineInstances) {
         mergedSessions.push({
            name: offline.instanceName,
            status: 'STOPPED',
            dbStats: offline
         });
      }

      return mergedSessions;
    } catch (error) {
      this.logger.error(`Failed to get sessions: ${error.message}`);
      throw error;
    }
  }

  async sendMessage(sessionName: string, chatId: string, text: string): Promise<any> {
    try {
      // Apply Random Delay (3 to 7 seconds) before sending message to prevent bans
      await this.randomDelay(3000, 7000);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/sendText`,
          { session: sessionName, chatId: chatId, text: text },
          { headers: this.getHeaders() }
        ),
      );
      
      // Increment messagesSent
      await this.prisma.whatsappInstance.update({
         where: { instanceName: sessionName },
         data: { messagesSent: { increment: 1 } }
      }).catch(e => this.logger.warn(`Failed to increment messagesSent for ${sessionName}`));

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      
      // Increment messagesFailed
      await this.prisma.whatsappInstance.update({
         where: { instanceName: sessionName },
         data: { messagesFailed: { increment: 1 } }
      }).catch(e => this.logger.warn(`Failed to increment messagesFailed for ${sessionName}`));
      
      throw error;
    }
  }

  async getQrCode(sessionName: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/${sessionName}/auth/qr`, {
          headers: { ...this.getHeaders(), 'Accept': 'image/png' },
          responseType: 'arraybuffer',
        }),
      );
      return response.data;
    } catch (error) {
      try {
        const fallbackResponse = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/api/sessions/${sessionName}/auth/qr`, {
            headers: { ...this.getHeaders(), 'Accept': 'image/png' },
            responseType: 'arraybuffer',
          }),
        );
        return fallbackResponse.data;
      } catch (innerError) {
        this.logger.error(`Failed to get QR code for session ${sessionName}`, innerError.message);
        throw innerError;
      }
    }
  }

  async stopSession(sessionName: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/sessions/stop`,
          { name: sessionName },
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to stop session ${sessionName}`, error.message);
      throw error;
    }
  }

  async logoutSession(sessionName: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/sessions/logout`,
          { name: sessionName },
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to logout session ${sessionName}`, error.message);
      throw error;
    }
  }
}
