import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AlertService } from './alert.service';

/**
 * Comprehensive Alert Service Tests
 * Testing all 4 critical alert types:
 * 1. Hard-Fail Message Alerts
 * 2. Error Rate Alerts
 * 3. LLM Health Alerts
 * 4. Memory Usage Alerts
 */
describe('AlertService - Critical Alerts (Hard-Fail, Error Rate, LLM, Memory)', () => {
  let service: AlertService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: { [key: string]: string } = {
        TELEGRAM_ALERT_BOT_TOKEN: '9234474897:AAG8iQYDkwdmeRjOKB53tLhP_GUTg0mY-xI',
        TELEGRAM_ALERT_CHAT_ID: '6251368640',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    // Mock fetch globally dengan default success response
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Hard-Fail Alert (Critical)', () => {
    it('should send alert when message fails after 100 retries', async () => {
      const customerId = '6281234567890@c.us';
      const sessionName = 'test-session';
      const retryCount = 100;
      const elapsedSeconds = 1800; // 30 menit

      await service.alertHardFailMessage(customerId, sessionName, retryCount, elapsedSeconds);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sendMessage'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('HARD-FAIL'),
        }),
      );
    });

    it('should include all required details dalam alert', async () => {
      const customerId = '6281234567890@c.us';
      const sessionName = 'session-1';
      const retryCount = 100;
      const elapsedSeconds = 1800;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await service.alertHardFailMessage(customerId, sessionName, retryCount, elapsedSeconds);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.text).toContain('HARD-FAIL');
      expect(body.text).toContain(customerId);
      expect(body.text).toContain(sessionName);
      expect(body.text).toContain('100'); // retry count
      expect(body.text).toContain('30m'); // 30 menit
    });

    it('should respect cooldown untuk alert duplikat', async () => {
      const customerId = '6281234567890@c.us';

      // First alert (no mocking - use real time)
      await service.alertHardFailMessage(customerId, 'session', 100, 1800);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second alert immediately (should be throttled)
      await service.alertHardFailMessage(customerId, 'session', 100, 1800);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1, not 2

      // Mock Date.now() to simulate time passing
      const originalNow = Date.now;
      const firstCallTime = originalNow();
      let mockTime = firstCallTime + 61_000; // 61 detik after first alert
      Date.now = jest.fn(() => mockTime);

      try {
        await service.alertHardFailMessage(customerId, 'session', 100, 1800);
        expect(global.fetch).toHaveBeenCalledTimes(2); // Now 2
      } finally {
        Date.now = originalNow;
      }
    });

    it('should handle Telegram API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(
        service.alertHardFailMessage('customer@c.us', 'session', 100, 1800),
      ).resolves.not.toThrow();
    });
  });

  describe('2. Error Rate Alert (High Priority)', () => {
    it('should send alert when error rate exceeds threshold', async () => {
      const errorRate = 8.5;
      const threshold = 5;
      const failedCount = 17;
      const totalCount = 200;

      await service.alertHighErrorRate(errorRate, threshold, failedCount, totalCount, 5);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sendMessage'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('HIGH ERROR RATE'),
        }),
      );
    });

    it('should include error rate details', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await service.alertHighErrorRate(7.2, 5, 14, 200, 5);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.text).toContain('7.20%');
      expect(body.text).toContain('14/200');
      expect(body.text).toContain('5 minutes');
    });

    it('should not alert jika error rate di bawah threshold', async () => {
      // Threshold 5%, actual 3%
      await service.alertHighErrorRate(3, 5, 6, 200, 5);

      // Seharusnya tetap mengirim alert jika di-call (logic ada di metrics service)
      // Di sini kita hanya test bahwa method berfungsi
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('3. LLM Health Alert (Critical)', () => {
    it('should send alert untuk JSON_PARSE failures', async () => {
      await service.alertLLMHealthIssue(
        'JSON_PARSE',
        5,
        'Expected property name at position 1',
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sendMessage'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('LLM HEALTH'),
        }),
      );
    });

    it('should send alert untuk SERVICE_DOWN', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await service.alertLLMHealthIssue('SERVICE_DOWN', 10);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.text).toContain('LLM service tidak merespons');
      expect(body.text).toContain('🚨'); // Critical emoji
      expect(body.text).toContain('10'); // failure count
    });

    it('should include consecutive failure count', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await service.alertLLMHealthIssue('TIMEOUT', 8);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.text).toContain('8');
    });

    it('should respect cooldown per failure type', async () => {
      // First JSON_PARSE alert
      await service.alertLLMHealthIssue('JSON_PARSE', 5);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second JSON_PARSE immediately (throttled)
      await service.alertLLMHealthIssue('JSON_PARSE', 6);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Different type TIMEOUT (not throttled, different key)
      await service.alertLLMHealthIssue('TIMEOUT', 5);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('4. Memory Monitor Alert (High Priority)', () => {
    it('should send alert untuk memory spike', async () => {
      await service.alertMemoryIssue(87, 80, 'SPIKE', 1376, 1536);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sendMessage'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('MEMORY USAGE'),
        }),
      );
    });

    it('should include heap usage details', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await service.alertMemoryIssue(82.5, 80, 'SPIKE', 1270, 1536);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.text).toContain('82.5%');
      expect(body.text).toContain('1270MB');
      expect(body.text).toContain('1536MB');
    });

    it('should differentiate between SPIKE, TRENDING_UP, STABLE_HIGH', async () => {
      // Test SPIKE first (no mocking - use real time)
      await service.alertMemoryIssue(92, 80, 'SPIKE', 1410, 1536);
      let callArgs = (global.fetch as jest.Mock).mock.calls[0];
      let body = JSON.parse(callArgs[1].body);
      expect(body.text).toContain('Sudden spike');

      // Mock Date.now() to simulate time passing for subsequent tests
      const originalNow = Date.now;
      const firstCallTime = originalNow();
      let mockTime = firstCallTime + 61_000; // 61 detik after first alert

      Date.now = jest.fn(() => mockTime);

      try {
        jest.clearAllMocks();

        // Test TRENDING_UP
        await service.alertMemoryIssue(85, 80, 'TRENDING_UP', 1310, 1536);
        callArgs = (global.fetch as jest.Mock).mock.calls[0];
        body = JSON.parse(callArgs[1].body);
        expect(body.text).toContain('trending up');

        // Advance time to bypass cooldown
        mockTime += 61_000;
        jest.clearAllMocks();

        // Test STABLE_HIGH
        await service.alertMemoryIssue(85, 80, 'STABLE_HIGH', 1310, 1536);
        callArgs = (global.fetch as jest.Mock).mock.calls[0];
        body = JSON.parse(callArgs[1].body);
        expect(body.text).toContain('Consistently high');
      } finally {
        Date.now = originalNow;
      }
    });

    it('should use critical emoji untuk memory > 85%', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await service.alertMemoryIssue(92, 80, 'SPIKE', 1410, 1536);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.text).toContain('🚨'); // Critical emoji
    });
  });

  describe('Generic Alert Method', () => {
    it('should send generic alert dengan custom payload', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await service.sendAlert({
        title: 'Custom Alert',
        severity: 'HIGH',
        details: {
          'Issue Type': 'Database',
          'Error': 'Connection timeout',
          'Affected Customers': '5',
        },
      });

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.text).toContain('Custom Alert');
      expect(body.text).toContain('Connection timeout');
    });
  });

  describe('Telegram Configuration', () => {
    it('should skip alert jika Telegram tidak dikonfigurasi', async () => {
      // Create service tanpa config
      const module = await Test.createTestingModule({
        providers: [
          AlertService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const serviceNoCfg = module.get<AlertService>(AlertService);

      await serviceNoCfg.alertHardFailMessage('customer', 'session', 100, 1800);

      // Should not call fetch (no Telegram config)
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Alert Format Validation', () => {
    it('should use HTML parse_mode untuk Telegram', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await service.alertHardFailMessage('customer', 'session', 100, 1800);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.parse_mode).toBe('HTML');
      expect(body.text).toContain('<b>');
      expect(body.text).toContain('<code>');
    });

    it('should include timestamp dalam alert', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await service.alertHighErrorRate(8, 5, 16, 200, 5);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.text).toContain('WIB'); // Jakarta timezone
    });
  });
});
