import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class WahaService {
  private readonly logger = new Logger(WahaService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
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

  // Adaptive delay based on WPM (Words Per Minute)
  private async adaptiveWpmDelay(text: string, wpm: number = 70): Promise<void> {
    // User requested a strict 3-4 seconds delay
    const finalDelay = Math.floor(Math.random() * (4000 - 3000 + 1)) + 3000;

    this.logger.log(`Typing delay: sleeping for ${finalDelay}ms...`);
    return new Promise(resolve => setTimeout(resolve, finalDelay));
  }

  // Sends the 'typing...' status to WA
  async sendTypingPresence(sessionName: string, chatId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/api/startTyping`,
        { session: sessionName, chatId: chatId },
        { headers: this.getHeaders() }
      );
    } catch (error) {
      this.logger.debug(`Could not send typing presence for ${sessionName}. Error: ${error.message}`);
    }
  }

  async startSession(sessionName: string, webhookUrls?: string | string[], channelAccountId?: string, tenantId?: string): Promise<any> {
    try {
      // Selalu upsert ke database agar sesi selalu tercatat
      // Verify tenantId exists if provided
      let validTenantId: string | undefined = tenantId;
      if (tenantId) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } }).catch(() => null);
        if (!tenant) {
          this.logger.warn(`Tenant ${tenantId} not found, creating instance without tenant association`);
          validTenantId = undefined;
        }
      }

      await this.prisma.whatsappInstance.upsert({
        where: { instanceName: sessionName },
        update: { channelAccountId: channelAccountId || null, tenantId: validTenantId || null },
        create: { instanceName: sessionName, channelAccountId: channelAccountId || null, tenantId: validTenantId || null, status: 'STOPPED' }
      });

      const payload: any = { name: sessionName };

      
      if (webhookUrls) {
        const urls = Array.isArray(webhookUrls) ? webhookUrls : [webhookUrls];
        const formattedUrls = urls.map(url => {
           let finalUrl = url.trim();
           if (!finalUrl.endsWith('/api/v1/waha/webhook')) {
              finalUrl = finalUrl.replace(/\/$/, '') + '/api/v1/waha/webhook';
           }
           return finalUrl;
        });
        
        payload.config = {
          webhooks: formattedUrls.map(url => ({
              url: url,
              events: ['message', 'message.any', 'session.status'],
              retries: {
                delaySeconds: 10,
                attempts: 15,
                policy: 'fixed'
              }
          }))
        };
      }

      // Add NOWEB specific configuration to ensure messages are captured
      payload.config = payload.config || {};
      payload.config.noweb = {
        markOnline: false,
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

      const response = await axios.post(
        `${this.baseUrl}/api/sessions/start`,
        payload,
        { headers: this.getHeaders() },
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
        const response = await axios.get(`${this.baseUrl}/api/sessions`, {
          headers: this.getHeaders(),
          timeout: 5000,
        });
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

      // Returning only active WAHA sessions with their DB stats
      return mergedSessions;
    } catch (error) {
      this.logger.error(`Failed to get sessions: ${error.message}`);
      throw error;
    }
  }

  async sendMessage(sessionName: string, chatId: string, text: string): Promise<any> {
    try {
      // Simulate human typing presence
      await this.sendTypingPresence(sessionName, chatId);
      
      // Apply Adaptive WPM Delay (around 70 WPM)
      await this.adaptiveWpmDelay(text, 70);

      const response = await axios.post(
        `${this.baseUrl}/api/sendText`,
        { session: sessionName, chatId: chatId, text: text },
        { headers: this.getHeaders() }
      );
      
      // Increment messagesSent
      await this.prisma.whatsappInstance.update({
         where: { instanceName: sessionName },
         data: { messagesSent: { increment: 1 } }
      }).catch(e => this.logger.warn(`Failed to increment messagesSent for ${sessionName}`));

      return response.data;
    } catch (error) {
      const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`Failed to send message: ${errorDetail}`);
      
      // Increment messagesFailed
      await this.prisma.whatsappInstance.update({
         where: { instanceName: sessionName },
         data: { messagesFailed: { increment: 1 } }
      }).catch(e => this.logger.warn(`Failed to increment messagesFailed for ${sessionName}`));
      
      throw error;
    }
  }

  async sendImage(sessionName: string, chatId: string, imageUrl: string, caption?: string): Promise<any> {
    try {
      // Simulate human typing presence
      await this.sendTypingPresence(sessionName, chatId);
      
      // Download the image first to avoid WAHA redirect/HTML issues
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      
      const base64Data = Buffer.from(imageResponse.data).toString('base64');
      const mimeType = String(imageResponse.headers['content-type'] || 'image/jpeg');
      
      const payload: any = {
        session: sessionName,
        chatId: chatId,
        file: { 
          mimetype: mimeType.includes('text/html') ? 'image/jpeg' : mimeType,
          filename: 'property-image.jpg',
          data: base64Data
        }
      };

      if (caption) {
        payload.caption = caption;
      }

      const response = await axios.post(
        `${this.baseUrl}/api/sendImage`,
        payload,
        { headers: this.getHeaders() }
      );
      
      await this.prisma.whatsappInstance.update({
         where: { instanceName: sessionName },
         data: { messagesSent: { increment: 1 } }
      }).catch(e => this.logger.warn(`Failed to increment messagesSent for ${sessionName}`));

      return response.data;
    } catch (error) {
      const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`Failed to send image: ${errorDetail}`);
      
      await this.prisma.whatsappInstance.update({
         where: { instanceName: sessionName },
         data: { messagesFailed: { increment: 1 } }
      }).catch(e => this.logger.warn(`Failed to increment messagesFailed for ${sessionName}`));
      
      throw error;
    }
  }

  async getQrCode(sessionName: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/${sessionName}/auth/qr`, {
        headers: { ...this.getHeaders(), 'Accept': 'image/png' },
        responseType: 'arraybuffer',
      });
      return response.data;
    } catch (error) {
      try {
        const fallbackResponse = await axios.get(`${this.baseUrl}/api/sessions/${sessionName}/auth/qr`, {
          headers: { ...this.getHeaders(), 'Accept': 'image/png' },
          responseType: 'arraybuffer',
        });
        return fallbackResponse.data;
      } catch (innerError) {
        this.logger.error(`Failed to get QR code for session ${sessionName}`, innerError.message);
        throw innerError;
      }
    }
  }

  async stopSession(sessionName: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/sessions/stop`,
        { name: sessionName },
        { headers: this.getHeaders() },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to stop session ${sessionName}`, error.message);
      throw error;
    }
  }

  async logoutSession(sessionName: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/sessions/logout`,
        { name: sessionName },
        { headers: this.getHeaders() },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to logout session ${sessionName}`, error.message);
      throw error;
    }
  }
}
