import { Controller, Get, Logger, SkipThrottle } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Monitoring API Controller
 * Exposes health metrics untuk monitoring dan debugging
 */
@SkipThrottle()
@Controller('api/v1/monitoring')
export class MonitoringController {
  private readonly logger = new Logger(MonitoringController.name);

  constructor(private readonly metricsService: MetricsService) {}

  /**
   * GET /api/v1/monitoring/health
   * Returns current system health metrics
   */
  @Public()
  @Get('health')
  getHealth() {
    const metrics = this.metricsService.getMetrics();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      metrics: metrics,
      alerts: {
        errorRateThreshold: 5,
        memoryThreshold: 80,
        llmFailureThreshold: 5,
      },
    };
  }

  /**
   * GET /api/v1/monitoring/metrics
   * Returns detailed metrics
   */
  @Public()
  @Get('metrics')
  getMetrics() {
    return {
      timestamp: new Date().toISOString(),
      ...this.metricsService.getMetrics(),
    };
  }

  /**
   * GET /api/v1/monitoring/ping
   * Simple liveness check
   */
  @Public()
  @Get('ping')
  ping() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
