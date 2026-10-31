import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// ponytail: in-memory cooldown agar alert Telegram tidak membanjiri chat saat terjadi error storm
let lastTelegramAlertAt = 0;
const TELEGRAM_ALERT_COOLDOWN_MS = 10000;

function sanitizePayload(body: any): string {
  if (!body || typeof body !== 'object') return '';
  try {
    const clone: Record<string, any> = { ...body };
    for (const key of Object.keys(clone)) {
      if (/pass|secret|token|auth|key|credit/i.test(key)) {
        clone[key] = '***';
      }
    }
    const str = JSON.stringify(clone);
    return str.length > 200 ? str.slice(0, 200) + '...' : str;
  } catch {
    return '[Unserializable]';
  }
}

async function sendTelegramAlert(
  status: number,
  method: string,
  url: string,
  userStr: string,
  ip: string,
  errorDetail: string,
) {
  const token =
    process.env.TELEGRAM_ALERT_BOT_TOKEN ||
    process.env.TELEGRAM_BOT_CS_DEV_API;
  const chatId =
    process.env.TELEGRAM_ALERT_CHAT_ID ||
    process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) return;
  if (Date.now() - lastTelegramAlertAt < TELEGRAM_ALERT_COOLDOWN_MS) return;
  lastTelegramAlertAt = Date.now();

  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
  });
  const text = `🚨 *[BACKEND ${status} CRASH]*\n📍 *Endpoint:* \`${method} ${url}\`\n👤 *User:* \`${userStr}\`\n🌐 *IP:* \`${ip}\`\n⏰ *Waktu:* ${timestamp}\n\n💥 *Error:*\n\`\`\`\n${errorDetail.slice(0, 500)}\n\`\`\``;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
  } catch {
    // silent catch agar kegagalan jaringan Telegram tidak memperparah lifecycle HTTP
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: any = { message: 'Internal server error' };
    let errorName = 'Error';

    // 1. Tangani Prisma Database Exceptions secara elegan (cegah 500 palsu)
    const prismaCode = (exception as any)?.code;
    if (typeof prismaCode === 'string' && prismaCode.startsWith('P')) {
      if (prismaCode === 'P2002') {
        status = HttpStatus.CONFLICT;
        const target = (exception as any)?.meta?.target;
        const fieldName = Array.isArray(target) ? target.join(', ') : 'terkait';
        errorResponse = { message: `Data ${fieldName} sudah digunakan.` };
        errorName = 'Conflict';
      } else if (prismaCode === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        errorResponse = { message: 'Data yang diminta tidak ditemukan.' };
        errorName = 'Not Found';
      } else if (prismaCode === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        errorResponse = { message: 'Relasi data referensi tidak valid.' };
        errorName = 'Bad Request';
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorResponse = exception.getResponse();
      errorName =
        (errorResponse as any)?.error ||
        (status === 404 ? 'Not Found' : 'Error');
    }

    const message =
      typeof errorResponse === 'string'
        ? errorResponse
        : (errorResponse as any).message || errorResponse;

    // 2. Kumpulkan konteks audit lengkap: User, Tenant, IP, Sanitized Body
    const user = (request as any)?.user;
    const userStr = user
      ? `${user.email || user.sub} (Tenant: ${user.tenantId || '-'})`
      : 'Anonymous';
    const clientIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      'unknown';
    const sanitizedBody = sanitizePayload(request.body);

    const reqId = (request as any)?.id || request.headers['x-request-id'] || '-';
    const logPrefix = `[${status}] [Req: ${reqId}] ${request.method} ${request.url}`;
    const logDetails = `| User: ${userStr} | IP: ${clientIp}${sanitizedBody ? ` | Body: ${sanitizedBody}` : ''} - ${Array.isArray(message) ? message.join('; ') : JSON.stringify(message)}`;

    if (status >= 500) {
      const errorMsg =
        exception instanceof Error ? exception.message : String(exception);
      this.logger.error(
        `${logPrefix} ${logDetails}`,
        exception instanceof Error ? exception.stack : undefined,
      );

      // Kirim alert realtime ke Telegram pengembang bila terjadi error 500
      sendTelegramAlert(
        status,
        request.method,
        request.url,
        userStr,
        clientIp,
        `ReqId: ${reqId}\n` +
          (exception instanceof Error ? exception.stack || errorMsg : errorMsg),
      );
    } else {
      this.logger.warn(`${logPrefix} ${logDetails}`);
    }

    response.status(status).json({
      statusCode: status,
      error: errorName,
      message: Array.isArray(message) ? message : [message],
      requestId: reqId !== '-' ? reqId : undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

