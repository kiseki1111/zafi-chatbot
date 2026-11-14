import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertService } from './alert.service';

interface MetricsWindow {
  totalMessages: number;
  failedMessages: number;
  successMessages: number;
  timestamp: number;
}

/**
 * Metrics Service untuk tracking error rate dan memory usage
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  // Error rate tracking (sliding window 5 menit)
  private metricsWindows: MetricsWindow[] = [];
  private readonly WINDOW_DURATION_MS = 5 * 60 * 1000; // 5 menit
  private readonly ERROR_RATE_THRESHOLD = 5; // 5%

  // Memory tracking
  private memoryReadings: number[] = [];
  private readonly MEMORY_THRESHOLD = 80; // 80% heap usage
  private readonly MEMORY_SPIKE_THRESHOLD = 10; // 10% sudden increase
  private lastMemoryReading = 0;

  constructor(private readonly alertService: AlertService) {
    this.setupMetricsCollection();
  }

  /**
   * Record message attempt
   */
  recordMessageAttempt(success: boolean): void {
    const now = Date.now();

    // Find or create window untuk detik ini
    let window = this.metricsWindows.find((w) => now - w.timestamp < this.WINDOW_DURATION_MS);

    if (!window) {
      window = {
        timestamp: now,
        totalMessages: 0,
        failedMessages: 0,
        successMessages: 0,
      };
      this.metricsWindows.push(window);
    }

    window.totalMessages++;
    if (success) {
      window.successMessages++;
    } else {
      window.failedMessages++;
    }

    // Clean up old windows
    this.metricsWindows = this.metricsWindows.filter(
      (w) => now - w.timestamp < this.WINDOW_DURATION_MS,
    );

    // Check error rate
    this.checkErrorRate();
  }

  /**
   * Check error rate dan trigger alert jika perlu
   */
  private checkErrorRate(): void {
    if (this.metricsWindows.length === 0) return;

    const totalMessages = this.metricsWindows.reduce(
      (sum, w) => sum + w.totalMessages,
      0,
    );
    const failedMessages = this.metricsWindows.reduce(
      (sum, w) => sum + w.failedMessages,
      0,
    );

    if (totalMessages === 0) return;

    const errorRate = (failedMessages / totalMessages) * 100;

    if (errorRate > this.ERROR_RATE_THRESHOLD) {
      this.logger.warn(
        `⚠️ High error rate detected: ${errorRate.toFixed(2)}% (${failedMessages}/${totalMessages})`,
      );

      this.alertService
        .alertHighErrorRate(errorRate, this.ERROR_RATE_THRESHOLD, failedMessages, totalMessages, 5)
        .catch((err) =>
          this.logger.warn(`Failed to send error rate alert: ${err.message}`),
        );
    }
  }

  /**
   * Cron job untuk memory monitoring setiap 5 detik
   */
  @Cron('*/5 * * * * *') // Every 5 seconds
  async monitorMemory(): Promise<void> {
    try {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapMaxMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const percentUsed = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      this.memoryReadings.push(percentUsed);

      // Keep only last 60 readings (5 menit)
      if (this.memoryReadings.length > 60) {
        this.memoryReadings.shift();
      }

      // Check for issues
      let trend: 'SPIKE' | 'TRENDING_UP' | 'STABLE_HIGH' = 'STABLE_HIGH';

      if (this.memoryReadings.length >= 2) {
        const currentReading = this.memoryReadings[this.memoryReadings.length - 1];
        const previousReading = this.memoryReadings[this.memoryReadings.length - 2];
        const spike = currentReading - previousReading;

        if (spike > this.MEMORY_SPIKE_THRESHOLD) {
          trend = 'SPIKE';
        } else if (this.memoryReadings.length >= 5) {
          const avgLast5 = this.memoryReadings.slice(-5).reduce((a, b) => a + b) / 5;
          if (
            avgLast5 > this.memoryReadings[this.memoryReadings.length - 6] * 1.05
          ) {
            trend = 'TRENDING_UP';
          }
        }
      }

      // Alert jika perlu
      if (percentUsed > this.MEMORY_THRESHOLD) {
        this.logger.warn(
          `⚠️ High memory usage: ${percentUsed.toFixed(1)}% (${heapUsedMB}MB / ${heapMaxMB}MB) - Trend: ${trend}`,
        );

        this.alertService
          .alertMemoryIssue(
            percentUsed,
            this.MEMORY_THRESHOLD,
            trend,
            heapUsedMB,
            heapMaxMB,
          )
          .catch((err) =>
            this.logger.warn(`Failed to send memory alert: ${err.message}`),
          );
      }

      this.lastMemoryReading = percentUsed;
    } catch (error: any) {
      this.logger.debug(`Memory monitoring error: ${error.message}`);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const totalMessages = this.metricsWindows.reduce(
      (sum, w) => sum + w.totalMessages,
      0,
    );
    const failedMessages = this.metricsWindows.reduce(
      (sum, w) => sum + w.failedMessages,
      0,
    );
    const successMessages = this.metricsWindows.reduce(
      (sum, w) => sum + w.successMessages,
      0,
    );

    const errorRate =
      totalMessages > 0 ? (failedMessages / totalMessages) * 100 : 0;

    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapMaxMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    return {
      messages: {
        total: totalMessages,
        success: successMessages,
        failed: failedMessages,
        errorRate: errorRate.toFixed(2) + '%',
      },
      memory: {
        heapUsedMB,
        heapMaxMB,
        percentUsed: memPercent.toFixed(1) + '%',
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      },
      window: {
        durationMinutes: 5,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Setup metrics collection
   */
  private setupMetricsCollection(): void {
    this.logger.log('✅ Metrics collection started (5min window, every 5s memory check)');
  }

  /**
   * Reset metrics (for testing)
   */
  resetMetrics(): void {
    this.metricsWindows = [];
    this.memoryReadings = [];
    this.logger.log('Metrics reset');
  }
}
