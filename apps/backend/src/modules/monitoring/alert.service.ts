import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AlertPayload {
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  details: Record<string, any>;
  timestamp?: Date;
}

/**
 * Centralized Alert Service untuk mengirim notifikasi ke Telegram
 * Supports: Hard-Fail, Error Rate, LLM Health, Memory Monitor
 */
@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private readonly token?: string;
  private readonly chatId?: string;
  private lastAlertTime = new Map<string, number>();
  private readonly ALERT_COOLDOWN_MS = 60_000; // 1 menit cooldown per alert type

  constructor(private readonly configService: ConfigService) {
    this.token =
      this.configService.get<string>('TELEGRAM_ALERT_BOT_TOKEN') ||
      this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.chatId = this.configService.get<string>('TELEGRAM_ALERT_CHAT_ID');

    if (!this.token || !this.chatId) {
      this.logger.warn(
        '⚠️ Telegram alert tidak dikonfigurasi - alerts akan diabaikan',
      );
    }
  }

  /**
   * 1. HARD-FAIL ALERT - Customer tidak dapat respons setelah 30 menit
   */
  async alertHardFailMessage(
    customerId: string,
    sessionName: string,
    retryCount: number,
    elapsedSeconds: number,
  ): Promise<void> {
    const alertKey = `hard-fail-${customerId}`;

    if (this.shouldThrottle(alertKey)) {
      this.logger.debug(`Hard-fail alert throttled untuk ${customerId}`);
      return;
    }

    const emoji = '⚠️';
    const text =
      `${emoji} <b>[HARD-FAIL MESSAGE]</b>\n\n` +
      `👤 <b>Customer:</b> <code>${customerId}</code>\n` +
      `📱 <b>Session:</b> <code>${sessionName}</code>\n` +
      `🔄 <b>Attempts:</b> ${retryCount}x\n` +
      `⏱️ <b>Duration:</b> ${this.formatSeconds(elapsedSeconds)}\n\n` +
      `❌ <b>Status:</b> FAILED (no response sent)\n` +
      `🔗 <b>Action:</b> Check logs & investigate\n` +
      `⏰ <b>Time:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;

    await this.sendTelegramAlert(text, 'hard-fail', alertKey);
  }

  /**
   * 2. ERROR RATE ALERT - Error rate > threshold dalam periode tertentu
   */
  async alertHighErrorRate(
    errorRate: number,
    threshold: number,
    failedCount: number,
    totalCount: number,
    periodMinutes: number = 5,
  ): Promise<void> {
    const alertKey = 'high-error-rate';

    if (this.shouldThrottle(alertKey)) {
      this.logger.debug('Error rate alert throttled');
      return;
    }

    const emoji = '🔴';
    const text =
      `${emoji} <b>[HIGH ERROR RATE]</b>\n\n` +
      `📊 <b>Error Rate:</b> ${errorRate.toFixed(2)}% (Threshold: ${threshold}%)\n` +
      `❌ <b>Failed Messages:</b> ${failedCount}/${totalCount}\n` +
      `⏱️ <b>Period:</b> Last ${periodMinutes} minutes\n\n` +
      `🚨 <b>Severity:</b> HIGH\n` +
      `🔗 <b>Action:</b> Check logs for error patterns\n` +
      `⏰ <b>Time:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;

    await this.sendTelegramAlert(text, 'error-rate', alertKey);
  }

  /**
   * 3. LLM HEALTH ALERT - LLM service failures atau JSON parse errors
   */
  async alertLLMHealthIssue(
    failureType: 'JSON_PARSE' | 'TIMEOUT' | 'SERVICE_DOWN' | 'RATE_LIMIT',
    consecutiveFailures: number,
    lastError?: string,
  ): Promise<void> {
    const alertKey = `llm-health-${failureType}`;

    if (this.shouldThrottle(alertKey)) {
      this.logger.debug(`LLM health alert throttled untuk ${failureType}`);
      return;
    }

    const failureDescriptions = {
      JSON_PARSE: 'Invalid JSON response dari LLM',
      TIMEOUT: 'LLM response timeout (> 120s)',
      SERVICE_DOWN: 'LLM service tidak merespons',
      RATE_LIMIT: 'LLM rate limit terlampaui',
    };

    const emoji = failureType === 'SERVICE_DOWN' ? '🚨' : '⚠️';
    const text =
      `${emoji} <b>[LLM HEALTH ISSUE]</b>\n\n` +
      `❌ <b>Issue Type:</b> ${failureDescriptions[failureType]}\n` +
      `📈 <b>Consecutive Failures:</b> ${consecutiveFailures}\n` +
      `${lastError ? `📝 <b>Last Error:</b> <code>${lastError.substring(0, 100)}</code>\n\n` : ''}` +
      `🔗 <b>Action:</b> Switch to fallback LLM if available\n` +
      `⏰ <b>Time:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;

    await this.sendTelegramAlert(text, 'llm-health', alertKey);
  }

  /**
   * 4. MEMORY MONITOR ALERT - Memory usage trending atau sudden spike
   */
  async alertMemoryIssue(
    currentUsagePercent: number,
    threshold: number,
    trend: 'SPIKE' | 'TRENDING_UP' | 'STABLE_HIGH',
    heapUsedMB: number,
    heapMaxMB: number,
  ): Promise<void> {
    const alertKey = 'memory-issue';

    if (this.shouldThrottle(alertKey)) {
      this.logger.debug('Memory alert throttled');
      return;
    }

    const trendDescriptions = {
      SPIKE: '⚡ Sudden spike detected',
      TRENDING_UP: '📈 Memory trending up',
      STABLE_HIGH: '⚠️ Consistently high',
    };

    const emoji = currentUsagePercent > 85 ? '🚨' : '⚠️';
    const text =
      `${emoji} <b>[MEMORY USAGE ALERT]</b>\n\n` +
      `💾 <b>Current Usage:</b> ${currentUsagePercent.toFixed(1)}% (Threshold: ${threshold}%)\n` +
      `📊 <b>Heap Usage:</b> ${heapUsedMB}MB / ${heapMaxMB}MB\n` +
      `📈 <b>Trend:</b> ${trendDescriptions[trend]}\n\n` +
      `⚠️ <b>Risk:</b> Possible memory leak or high load\n` +
      `🔗 <b>Action:</b> Monitor closely, consider restart if > 90%\n` +
      `⏰ <b>Time:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;

    await this.sendTelegramAlert(text, 'memory', alertKey);
  }

  /**
   * Generic alert method
   */
  async sendAlert(payload: AlertPayload): Promise<void> {
    const text = this.formatAlertText(payload);
    const alertKey = `custom-${payload.title.replace(/\s+/g, '-')}`;
    await this.sendTelegramAlert(text, payload.severity, alertKey);
  }

  /**
   * Internal: Send to Telegram
   */
  private async sendTelegramAlert(
    text: string,
    type: string,
    throttleKey: string,
  ): Promise<void> {
    if (!this.token || !this.chatId) {
      this.logger.warn(
        `⚠️ Alert tidak terkirim (Telegram not configured): ${type}`,
      );
      return;
    }

    try {
      this.recordAlertSent(throttleKey);

      const response = await fetch(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId,
            text,
            parse_mode: 'HTML',
            disable_notification: type === 'MEDIUM' || type === 'LOW',
          }),
        },
      );

      if (!response.ok) {
        this.logger.error(
          `❌ Failed to send Telegram alert: ${response.statusText}`,
        );
        return;
      }

      this.logger.log(`✅ Alert sent: ${type}`);
    } catch (error: any) {
      this.logger.error(
        `❌ Telegram alert error: ${error.message || String(error)}`,
      );
    }
  }

  /**
   * Format custom alert
   */
  private formatAlertText(payload: AlertPayload): string {
    const emojiMap = {
      CRITICAL: '🚨',
      HIGH: '🔴',
      MEDIUM: '🟡',
      LOW: '🔵',
    };

    const emoji = emojiMap[payload.severity] || '⚠️';
    let text = `${emoji} <b>[${payload.severity}] ${payload.title}</b>\n\n`;

    for (const [key, value] of Object.entries(payload.details)) {
      text += `<b>${key}:</b> ${value}\n`;
    }

    text += `\n⏰ <b>Time:</b> ${(payload.timestamp || new Date()).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;

    return text;
  }

  /**
   * Helpers
   */
  private shouldThrottle(alertKey: string): boolean {
    const lastTime = this.lastAlertTime.get(alertKey) || 0;
    const now = Date.now();
    return now - lastTime < this.ALERT_COOLDOWN_MS;
  }

  private recordAlertSent(alertKey: string): void {
    this.lastAlertTime.set(alertKey, Date.now());
  }

  private formatSeconds(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  }
}
