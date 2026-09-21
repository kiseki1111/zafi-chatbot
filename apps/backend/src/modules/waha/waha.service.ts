import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WahaService {
  private readonly logger = new Logger(WahaService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'WAHA_API_URL',
      'http://103.30.195.145:3060',
    );
    this.apiKey = this.configService.get<string>(
      'WAHA_API_KEY',
      'ZafitechDunia12345#',
    );
  }

  private getHeaders() {
    return {
      Accept: 'application/json',
      'X-Api-Key': this.apiKey,
    };
  }

  // Helper for random delay (3-7 seconds) to simulate human typing
  private async randomDelay(
    minMs: number = 3000,
    maxMs: number = 7000,
  ): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    this.logger.log(
      `Sleeping for ${delay}ms before sending message (Anti-Spam)...`,
    );
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  // Adaptive delay based on WPM (Words Per Minute)
  private async adaptiveWpmDelay(
    text: string,
    wpm: number = 70,
  ): Promise<void> {
    // User requested a strict 3-4 seconds delay
    const finalDelay = Math.floor(Math.random() * (4000 - 3000 + 1)) + 3000;

    this.logger.log(`Typing delay: sleeping for ${finalDelay}ms...`);
    return new Promise((resolve) => setTimeout(resolve, finalDelay));
  }

  // Sends the 'typing...' status to WA
  async sendTypingPresence(sessionName: string, chatId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/api/startTyping`,
        { session: sessionName, chatId: chatId },
        { headers: this.getHeaders() },
      );
    } catch (error) {
      this.logger.debug(
        `Could not send typing presence for ${sessionName}. Error: ${error.message}`,
      );
    }
  }

  async startSession(
    sessionName: string,
    webhookUrls?: string | string[],
    channelAccountId?: string,
    tenantId?: string,
  ): Promise<any> {
    try {
      // Selalu upsert ke database agar sesi selalu tercatat
      // Verify tenantId exists if provided
      let validTenantId: string | undefined = tenantId;
      if (tenantId) {
        const tenant = await this.prisma.tenant
          .findUnique({ where: { id: tenantId } })
          .catch(() => null);
        if (!tenant) {
          this.logger.warn(
            `Tenant ${tenantId} not found, creating instance without tenant association`,
          );
          validTenantId = undefined;
        }
      }

      await this.prisma.whatsappInstance.upsert({
        where: { instanceName: sessionName },
        update: {
          channelAccountId: channelAccountId || null,
          tenantId: validTenantId || null,
        },
        create: {
          instanceName: sessionName,
          channelAccountId: channelAccountId || null,
          tenantId: validTenantId || null,
          status: 'STOPPED',
        },
      });

      const payload: any = { name: sessionName };

      if (webhookUrls) {
        const urls = Array.isArray(webhookUrls) ? webhookUrls : [webhookUrls];
        const formattedUrls = urls.map((url) => {
          let finalUrl = url.trim();
          if (!finalUrl.endsWith('/api/v1/waha/webhook')) {
            finalUrl = finalUrl.replace(/\/$/, '') + '/api/v1/waha/webhook';
          }
          return finalUrl;
        });

        payload.config = {
          webhooks: formattedUrls.map((url) => ({
            url: url,
            events: ['message', 'message.any', 'session.status'],
            retries: {
              delaySeconds: 10,
              attempts: 15,
              policy: 'fixed',
            },
          })),
        };
      }

      // Add NOWEB specific configuration to ensure messages are captured
      payload.config = payload.config || {};
      payload.config.noweb = {
        markOnline: false,
        store: {
          enabled: true,
          fullSync: false, // Disable fullSync because personal WA history is too large
        },
      };

      // Ignore status, groups, channels, and broadcast so WAHA only emits direct messages
      payload.config.ignore = {
        status: true,
        groups: true,
        channels: true,
        broadcast: true,
      };

      const response = await axios.post(
        `${this.baseUrl}/api/sessions/start`,
        payload,
        { headers: this.getHeaders() },
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to start session ${sessionName}`,
        error.message,
      );
      throw error;
    }
  }

  async getSessions(tenantId?: string): Promise<any> {
    try {
      let wahaSessions: any[] = [];
      try {
        const response = await axios.get(`${this.baseUrl}/api/sessions`, {
          headers: this.getHeaders(),
          timeout: 5000,
        });
        wahaSessions = response.data || [];
      } catch (httpErr) {
        this.logger.warn(
          `WAHA API is unreachable: ${httpErr.message}. Falling back to database records.`,
        );
      }

      // If WAHA API unreachable or returned empty, fallback to database
      if (wahaSessions.length === 0) {
        const dbInstances = await this.prisma.whatsappInstance.findMany({
          where: tenantId ? { tenantId } : {},
          orderBy: { createdAt: 'desc' },
        });
        return dbInstances.map((inst) => ({
          name: inst.instanceName,
          status: inst.status,
          me: { id: inst.phone, pushName: inst.profileName },
          dbStats: inst,
        }));
      }

      const mergedSessions = await Promise.all(
        wahaSessions.map(async (ws) => {
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
            },
          });
          return { ...ws, dbStats: instance };
        }),
      );

      // Filter by tenantId if provided
      if (tenantId) {
        return mergedSessions.filter((s) => s.dbStats?.tenantId === tenantId);
      }

      return mergedSessions;
    } catch (error) {
      this.logger.error(`Failed to get sessions: ${error.message}`);
      throw error;
    }
  }

  async sendMessage(
    sessionName: string,
    chatId: string,
    text: string,
  ): Promise<any> {
    try {
      // Simulate human typing presence
      await this.sendTypingPresence(sessionName, chatId);

      // Apply Adaptive WPM Delay (around 70 WPM)
      await this.adaptiveWpmDelay(text, 70);

      const response = await axios.post(
        `${this.baseUrl}/api/sendText`,
        { session: sessionName, chatId: chatId, text: text },
        { headers: this.getHeaders() },
      );

      // Increment messagesSent
      await this.prisma.whatsappInstance
        .update({
          where: { instanceName: sessionName },
          data: { messagesSent: { increment: 1 } },
        })
        .catch((e) =>
          this.logger.warn(
            `Failed to increment messagesSent for ${sessionName}`,
          ),
        );

      return response.data;
    } catch (error) {
      const errorDetail = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      this.logger.error(`Failed to send message: ${errorDetail}`);

      // Increment messagesFailed
      await this.prisma.whatsappInstance
        .update({
          where: { instanceName: sessionName },
          data: { messagesFailed: { increment: 1 } },
        })
        .catch((e) =>
          this.logger.warn(
            `Failed to increment messagesFailed for ${sessionName}`,
          ),
        );

      throw error;
    }
  }

  private getMediaBaseUrl(): string {
    return (
      this.configService.get<string>('PUBLIC_URL') ||
      this.configService.get<string>('BACKEND_PUBLIC_URL') ||
      'https://nexara.zafitech.my.id'
    ).replace(/\/+$/, '');
  }

  private resolveMediaUrl(url: string): string {
    if (!url) return url;
    // Path relatif /uploads/... atau /api/... -> ubah ke URL absolut
    if (url.startsWith('/')) {
      return `${this.getMediaBaseUrl()}${url}`;
    }
    return url;
  }

  /**
   * Jika URL mengarah ke /uploads/ (publik), coba baca file langsung dari disk lokal
   * untuk menghindari loop HTTP ke Cloudflare (ETIMEDOUT). Mengembalikan path file lokal
   * atau null jika file tidak ditemukan di disk.
   */
  private resolveToLocalFile(mediaUrl: string): string | null {
    if (!mediaUrl) return null;
    try {
      const baseUrl = this.getMediaBaseUrl();
      let pathPart: string | null = null;

      if (mediaUrl.startsWith('/')) {
        pathPart = mediaUrl;
      } else if (mediaUrl.startsWith(baseUrl)) {
        pathPart = mediaUrl.substring(baseUrl.length);
      }

      if (!pathPart) return null;

      // Hanya tangani file di folder uploads lokal
      const uploadsIdx = pathPart.indexOf('/uploads/');
      if (uploadsIdx === -1) return null;
      const relPath = pathPart.substring(uploadsIdx + '/uploads/'.length);

      const localFile = path.join(
        process.cwd(),
        'uploads',
        decodeURIComponent(relPath),
      );
      if (fs.existsSync(localFile)) {
        return localFile;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  private readLocalMediaFile(localFile: string, fallbackMime: string): { data: Buffer; mime: string } | null {
    try {
      const buffer = fs.readFileSync(localFile);
      const ext = path.extname(localFile).toLowerCase().replace('.', '');
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        webm: 'video/webm',
      };
      return { data: buffer, mime: mimeMap[ext] || fallbackMime };
    } catch (e) {
      return null;
    }
  }

  async sendImage(
    sessionName: string,
    chatId: string,
    imageUrl: string,
    caption?: string,
  ): Promise<any> {
    try {
      imageUrl = this.resolveMediaUrl(imageUrl);
      this.logger.log(
        `[WAHA-SEND-IMAGE] Sesi=${sessionName} | Chat=${chatId} | URL yang diakses: ${imageUrl}`,
      );
      // Simulate human typing presence
      await this.sendTypingPresence(sessionName, chatId);

      // Prioritaskan baca dari disk lokal (hindari loop HTTP ke Cloudflare)
      let base64Data: string;
      let mimeType: string;
      const localFile = this.resolveToLocalFile(imageUrl);
      if (localFile) {
        const fileData = this.readLocalMediaFile(localFile, 'image/jpeg');
        if (fileData) {
          base64Data = fileData.data.toString('base64');
          mimeType = fileData.mime;
          this.logger.log(
            `[WAHA-SEND-IMAGE] Membaca dari disk lokal: ${localFile}`,
          );
        } else {
          const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
          });
          base64Data = Buffer.from(imageResponse.data).toString('base64');
          mimeType = String(
            imageResponse.headers['content-type'] || 'image/jpeg',
          );
        }
      } else {
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
        });
        base64Data = Buffer.from(imageResponse.data).toString('base64');
        mimeType = String(
          imageResponse.headers['content-type'] || 'image/jpeg',
        );
      }

      const payload: any = {
        session: sessionName,
        chatId: chatId,
        file: {
          mimetype: mimeType.includes('text/html') ? 'image/jpeg' : mimeType,
          filename: 'property-image.jpg',
          data: base64Data,
        },
      };

      if (caption) {
        payload.caption = caption;
      }

      const response = await axios.post(
        `${this.baseUrl}/api/sendImage`,
        payload,
        { headers: this.getHeaders() },
      );

      await this.prisma.whatsappInstance
        .update({
          where: { instanceName: sessionName },
          data: { messagesSent: { increment: 1 } },
        })
        .catch((e) =>
          this.logger.warn(
            `Failed to increment messagesSent for ${sessionName}`,
          ),
        );

      return response.data;
    } catch (error) {
      const errorDetail = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      this.logger.error(
        `Failed to send image. URL=${imageUrl} | Error: ${errorDetail}`,
      );

      await this.prisma.whatsappInstance
        .update({
          where: { instanceName: sessionName },
          data: { messagesFailed: { increment: 1 } },
        })
        .catch((e) =>
          this.logger.warn(
            `Failed to increment messagesFailed for ${sessionName}`,
          ),
        );

      throw error;
    }
  }

  async sendMedia(
    sessionName: string,
    chatId: string,
    mediaUrl: string,
    caption?: string,
  ): Promise<any> {
    mediaUrl = this.resolveMediaUrl(mediaUrl);
    this.logger.log(
      `[WAHA-SEND-MEDIA] Sesi=${sessionName} | Chat=${chatId} | URL yang diakses: ${mediaUrl}`,
    );
    const isVideo = /\.(mp4|mov|webm|mkv|ogg)($|\?)/i.test(mediaUrl);
    if (isVideo) {
      return this.sendVideoFile(sessionName, chatId, mediaUrl, caption);
    }
    return this.sendImage(sessionName, chatId, mediaUrl, caption);
  }

  // Kirim video sebagai file/dokumen MP4 (kompatibel penuh dengan semua perangkat
  // tanpa memerlukan FFmpeg di WAHA tier free untuk metadata durasi native)
  async sendVideoFile(
    sessionName: string,
    chatId: string,
    videoUrl: string,
    caption?: string,
  ): Promise<any> {
    try {
      videoUrl = this.resolveMediaUrl(videoUrl);
      this.logger.log(
        `[WAHA-SEND-VIDEO] Sesi=${sessionName} | Chat=${chatId} | URL yang diakses: ${videoUrl}`,
      );
      await this.sendTypingPresence(sessionName, chatId);

      let filePayload: any = {
        mimetype: 'video/mp4',
        filename: 'video-properti.mp4',
      };

      // Prioritaskan baca dari disk lokal (hindari loop HTTP ke Cloudflare)
      const localFile = this.resolveToLocalFile(videoUrl);
      if (localFile) {
        const fileData = this.readLocalMediaFile(localFile, 'video/mp4');
        if (fileData) {
          filePayload.data = fileData.data.toString('base64');
          filePayload.mimetype = fileData.mime;
          this.logger.log(
            `[WAHA-SEND-VIDEO] Membaca dari disk lokal: ${localFile}`,
          );
        }
      }

      if (!filePayload.data) {
        try {
          const downloadRes = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 40000,
          });
          const base64Data = Buffer.from(downloadRes.data).toString('base64');
          filePayload.data = base64Data;
        } catch (dlErr) {
          // Fallback: kirim URL langsung jika unduhan lokal gagal
          filePayload.url = videoUrl;
        }
      }

      const payload: any = {
        session: sessionName,
        chatId: chatId,
        file: filePayload,
      };
      if (caption) payload.caption = caption;

      // /api/sendFile menghasilkan documentMessage MP4 yang bisa dibuka & diputar
      // di semua perangkat (iPhone & Android) tanpa bergantung FFmpeg di WAHA
      const response = await axios.post(
        `${this.baseUrl}/api/sendFile`,
        payload,
        {
          headers: this.getHeaders(),
          timeout: 50000,
        },
      );

      await this.prisma.whatsappInstance
        .update({
          where: { instanceName: sessionName },
          data: { messagesSent: { increment: 1 } },
        })
        .catch(() => null);

      return response.data;
    } catch (error: any) {
      const errorDetail = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      this.logger.error(
        `Failed to send video file. URL=${videoUrl} | Error: ${errorDetail}`,
      );
      throw error;
    }
  }

  async sendVideo(
    sessionName: string,
    chatId: string,
    videoUrl: string,
    caption?: string,
  ): Promise<any> {
    try {
      videoUrl = this.resolveMediaUrl(videoUrl);
      await this.sendTypingPresence(sessionName, chatId);

      let filePayload: any = {
        mimetype: 'video/mp4',
      };

      // 1. Prioritaskan baca langsung dari disk lokal jika file ada di uploads
      const localFile = this.resolveToLocalFile(videoUrl);
      if (localFile) {
        const fileData = this.readLocalMediaFile(localFile, 'video/mp4');
        if (fileData) {
          filePayload.data = `data:video/mp4;base64,${fileData.data.toString('base64')}`;
          this.logger.log(
            `[WAHA-SEND-VIDEO-NATIVE] Membaca video langsung dari disk lokal: ${localFile}`,
          );
        }
      }

      // 2. Jika bukan file lokal, download via HTTP
      if (!filePayload.data) {
        try {
          const downloadRes = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 35000,
          });
          const base64Data = Buffer.from(downloadRes.data).toString('base64');
          filePayload.data = `data:video/mp4;base64,${base64Data}`;
        } catch (dlErr) {
          filePayload.url = videoUrl;
        }
      }

      const payload: any = {
        session: sessionName,
        chatId: chatId,
        file: filePayload,
      };
      if (caption) payload.caption = caption;

      // Gunakan /api/sendVideo untuk menghasilkan native playable videoMessage di WhatsApp
      const response = await axios.post(
        `${this.baseUrl}/api/sendVideo`,
        payload,
        {
          headers: this.getHeaders(),
          timeout: 45000,
        },
      );

      await this.prisma.whatsappInstance
        .update({
          where: { instanceName: sessionName },
          data: { messagesSent: { increment: 1 } },
        })
        .catch(() => null);

      return response.data;
    } catch (error: any) {
      const errorDetail = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      this.logger.error(`Failed to send native video: ${errorDetail}`);
      throw error;
    }
  }

  async getMediaFile(sessionName: string, messageId: string): Promise<{ data: Buffer; mimetype: string } | null> {
    try {
      // WAHA provides endpoints to download media by message ID or file path
      const endpoints = [
        `${this.baseUrl}/api/${sessionName}/chats/messages/${encodeURIComponent(messageId)}/media`,
        `${this.baseUrl}/api/files/${encodeURIComponent(messageId)}`,
        `${this.baseUrl}/api/files/${sessionName}/${encodeURIComponent(messageId)}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const res = await axios.get(endpoint, {
            headers: this.getHeaders(),
            responseType: 'arraybuffer',
          });
          if (res.status === 200 && res.data) {
            return {
              data: Buffer.from(res.data),
              mimetype: String(res.headers['content-type'] || 'image/jpeg'),
            };
          }
        } catch (e) {
          // Try next endpoint pattern
        }
      }
      return null;
    } catch (e) {
      this.logger.warn(`Could not retrieve media file for ${messageId}: ${e.message}`);
      return null;
    }
  }

  /**
   * Unduh media yang diterima dan simpan ke folder uploads lokal (VPS disk),
   * agar gambar/video dapat langsung ditampilkan di dashboard monitoring.
   * Mengembalikan URL lokal (/uploads/...) atau null jika gagal.
   */
  async downloadAndStoreMedia(
    sessionName: string,
    messageId: string,
    mediaUrl?: string | null,
  ): Promise<string | null> {
    try {
      this.logger.log(
        `[MEDIA-DOWNLOAD] Sesi=${sessionName} | MsgId=${messageId} | URL sumber: ${mediaUrl || '(tidak ada)'}`,
      );
      // Jika sudah URL lokal, tidak perlu diunduh lagi
      if (mediaUrl && mediaUrl.startsWith('/uploads/')) {
        return mediaUrl;
      }
      // Data URI (base64) — langsung simpan
      if (mediaUrl && mediaUrl.startsWith('data:')) {
        const match = mediaUrl.match(/^data:([^;]+);base64,(.*)$/);
        if (match) {
          const ext = (match[1].split('/')[1] || 'png').replace('jpeg', 'jpg');
          const buffer = Buffer.from(match[2], 'base64');
          return this.writeMediaBuffer(buffer, match[1], ext);
        }
      }

      // 1. Coba unduh via WAHA media endpoint (untuk URL proxy /api/v1/waha/media/...)
      if (mediaUrl && mediaUrl.includes('/api/v1/waha/media/')) {
        const file = await this.getMediaFile(sessionName, messageId);
        if (file && file.data.length > 0) {
          const ext = (file.mimetype.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
          return this.writeMediaBuffer(file.data, file.mimetype, ext);
        }
      }

      // 2. Coba unduh langsung dari URL eksternal (WhatsApp CDN / hosted)
      if (mediaUrl && mediaUrl.startsWith('http')) {
        // Perbaiki URL media dari WAHA yang salah host/port (mis. localhost:3000)
        // -> arahkan ke baseUrl WAHA yang benar
        let targetUrl = mediaUrl;
        if (
          /localhost|127\.0\.0\.1|\.\.:3000/i.test(mediaUrl) &&
          mediaUrl.includes('/api/files/')
        ) {
          const pathPart = mediaUrl.substring(mediaUrl.indexOf('/api/files/'));
          targetUrl = `${this.baseUrl}${pathPart}`;
          this.logger.log(
            `[MEDIA-DOWNLOAD] Memperbaiki URL WAHA: ${mediaUrl} -> ${targetUrl}`,
          );
        }

        const res = await axios.get(targetUrl, {
          responseType: 'arraybuffer',
          headers: this.getHeaders(),
          timeout: 30000,
        });
        const mime = String(res.headers['content-type'] || 'image/jpeg');
        const ext = (mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
        return this.writeMediaBuffer(Buffer.from(res.data), mime, ext);
      }

      return null;
    } catch (e) {
      this.logger.warn(
        `Could not download & store media ${messageId}: ${e.message}`,
      );
      return null;
    }
  }

  private writeMediaBuffer(
    buffer: Buffer,
    mimetype: string,
    ext: string,
  ): string | null {
    try {
      const uploadsPath = path.join(process.cwd(), 'uploads', 'incoming');
      if (!fs.existsSync(uploadsPath)) {
        fs.mkdirSync(uploadsPath, { recursive: true });
      }
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
      const filePath = path.join(uploadsPath, filename);
      fs.writeFileSync(filePath, buffer);
      return `/uploads/incoming/${filename}`;
    } catch (e) {
      this.logger.warn(`Could not write media to disk: ${e.message}`);
      return null;
    }
  }

  async getQrCode(sessionName: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/${sessionName}/auth/qr`,
        {
          headers: { ...this.getHeaders(), Accept: 'image/png' },
          responseType: 'arraybuffer',
        },
      );
      return response.data;
    } catch (error) {
      try {
        const fallbackResponse = await axios.get(
          `${this.baseUrl}/api/sessions/${sessionName}/auth/qr`,
          {
            headers: { ...this.getHeaders(), Accept: 'image/png' },
            responseType: 'arraybuffer',
          },
        );
        return fallbackResponse.data;
      } catch (innerError) {
        this.logger.error(
          `Failed to get QR code for session ${sessionName}`,
          innerError.message,
        );
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
      this.logger.error(
        `Failed to logout session ${sessionName}`,
        error.message,
      );
      throw error;
    }
  }
}
