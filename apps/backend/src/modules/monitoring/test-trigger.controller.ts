import { Controller, Post, Query, Logger } from '@nestjs/common';
import { AlertService } from './alert.service';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Test Trigger Controller untuk Manual Alert Testing
 * Hanya untuk development - gunakan untuk verify Telegram notifications
 *
 * Endpoints:
 * POST /api/v1/monitoring/test-trigger/hard-fail
 * POST /api/v1/monitoring/test-trigger/error-rate
 * POST /api/v1/monitoring/test-trigger/llm-health
 * POST /api/v1/monitoring/test-trigger/memory
 */
@Controller('api/v1/monitoring/test-trigger')
export class TestTriggerController {
  private readonly logger = new Logger(TestTriggerController.name);

  constructor(private readonly alertService: AlertService) {}

  /**
   * POST /api/v1/monitoring/test-trigger/hard-fail
   * Trigger HARD-FAIL alert
   */
  @Public()
  @Post('hard-fail')
  async triggerHardFailAlert(
    @Query('customerId') customerId: string = '6281234567890@c.us',
    @Query('sessionName') sessionName: string = 'test-session-hardFail',
    @Query('retryCount') retryCount: number = 100,
    @Query('elapsedSeconds') elapsedSeconds: number = 1800,
  ) {
    this.logger.log('🧪 Triggering HARD-FAIL alert...');

    await this.alertService.alertHardFailMessage(
      customerId,
      sessionName,
      retryCount,
      elapsedSeconds,
    );

    return {
      status: 'sent',
      alert: 'HARD-FAIL',
      customerId,
      sessionName,
      message: '✅ Check Telegram untuk notifikasi HARD-FAIL',
    };
  }

  /**
   * POST /api/v1/monitoring/test-trigger/error-rate
   * Trigger ERROR RATE alert
   */
  @Public()
  @Post('error-rate')
  async triggerErrorRateAlert(
    @Query('errorRate') errorRate: number = 8.5,
    @Query('threshold') threshold: number = 5,
    @Query('failedCount') failedCount: number = 17,
    @Query('totalCount') totalCount: number = 200,
  ) {
    this.logger.log('🧪 Triggering ERROR RATE alert...');

    await this.alertService.alertHighErrorRate(
      errorRate,
      threshold,
      failedCount,
      totalCount,
      5,
    );

    return {
      status: 'sent',
      alert: 'ERROR_RATE',
      errorRate: `${errorRate}%`,
      threshold: `${threshold}%`,
      message: '✅ Check Telegram untuk notifikasi ERROR RATE',
    };
  }

  /**
   * POST /api/v1/monitoring/test-trigger/llm-health
   * Trigger LLM HEALTH alert
   */
  @Public()
  @Post('llm-health')
  async triggerLLMHealthAlert(
    @Query('failureType')
    failureType: 'JSON_PARSE' | 'TIMEOUT' | 'SERVICE_DOWN' | 'RATE_LIMIT' =
      'JSON_PARSE',
    @Query('consecutiveFailures') consecutiveFailures: number = 5,
    @Query('lastError')
    lastError: string = 'Expected property name at position 1',
  ) {
    this.logger.log(`🧪 Triggering LLM HEALTH alert (${failureType})...`);

    await this.alertService.alertLLMHealthIssue(
      failureType,
      consecutiveFailures,
      lastError,
    );

    return {
      status: 'sent',
      alert: 'LLM_HEALTH',
      failureType,
      consecutiveFailures,
      message: '✅ Check Telegram untuk notifikasi LLM HEALTH',
    };
  }

  /**
   * POST /api/v1/monitoring/test-trigger/memory
   * Trigger MEMORY alert
   */
  @Public()
  @Post('memory')
  async triggerMemoryAlert(
    @Query('usagePercent') usagePercent: number = 92,
    @Query('threshold') threshold: number = 80,
    @Query('trend') trend: 'SPIKE' | 'TRENDING_UP' | 'STABLE_HIGH' = 'SPIKE',
    @Query('heapUsedMB') heapUsedMB: number = 1410,
    @Query('heapMaxMB') heapMaxMB: number = 1536,
  ) {
    this.logger.log(`🧪 Triggering MEMORY alert (${trend})...`);

    await this.alertService.alertMemoryIssue(
      usagePercent,
      threshold,
      trend,
      heapUsedMB,
      heapMaxMB,
    );

    return {
      status: 'sent',
      alert: 'MEMORY',
      usagePercent: `${usagePercent}%`,
      trend,
      heapUsage: `${heapUsedMB}MB / ${heapMaxMB}MB`,
      message: '✅ Check Telegram untuk notifikasi MEMORY',
    };
  }

  /**
   * POST /api/v1/monitoring/test-trigger/all
   * Trigger semua alert types untuk comprehensive test
   */
  @Public()
  @Post('all')
  async triggerAllAlerts() {
    this.logger.log('🧪 Triggering ALL alert types...');

    const results: string[] = [];

    try {
      await this.alertService.alertHardFailMessage(
        '6281234567890@c.us',
        'test-all-alerts-1',
        100,
        1800,
      );
      results.push('✅ HARD-FAIL sent');
    } catch (e: any) {
      results.push(`❌ HARD-FAIL failed: ${e.message}`);
    }

    await new Promise((r) => setTimeout(r, 1000));

    try {
      await this.alertService.alertHighErrorRate(8.5, 5, 17, 200, 5);
      results.push('✅ ERROR_RATE sent');
    } catch (e: any) {
      results.push(`❌ ERROR_RATE failed: ${e.message}`);
    }

    await new Promise((r) => setTimeout(r, 1000));

    try {
      await this.alertService.alertLLMHealthIssue(
        'JSON_PARSE',
        5,
        'Expected property at position 1',
      );
      results.push('✅ LLM_HEALTH (JSON_PARSE) sent');
    } catch (e: any) {
      results.push(`❌ LLM_HEALTH failed: ${e.message}`);
    }

    await new Promise((r) => setTimeout(r, 1000));

    try {
      await this.alertService.alertMemoryIssue(92, 80, 'SPIKE', 1410, 1536);
      results.push('✅ MEMORY (SPIKE) sent');
    } catch (e: any) {
      results.push(`❌ MEMORY failed: ${e.message}`);
    }

    return {
      status: 'completed',
      message: '✅ Semua alerts dikirim - check Telegram Anda!',
      results,
    };
  }
}
