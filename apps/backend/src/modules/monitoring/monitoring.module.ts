import { Module } from '@nestjs/common';
import { AlertService } from './alert.service';
import { MetricsService } from './metrics.service';
import { MonitoringController } from './monitoring.controller';
import { TestTriggerController } from './test-trigger.controller';

/**
 * Monitoring Module
 * Provides:
 * - AlertService: Sends alerts to Telegram (Hard-Fail, Error Rate, LLM Health, Memory)
 * - MetricsService: Tracks metrics and triggers alerts
 * - MonitoringController: Exposes metrics via API
 * - TestTriggerController: Manual trigger endpoints for testing (dev only)
 */
@Module({
  providers: [AlertService, MetricsService],
  controllers: [MonitoringController, TestTriggerController],
  exports: [AlertService, MetricsService],
})
export class MonitoringModule {}
