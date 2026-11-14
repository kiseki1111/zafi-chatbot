/**
 * Integration Tests - Real Telegram Notifications
 * Test notifikasi Telegram dengan scenario nyata
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AlertService } from './alert.service';

describe('AlertService - Real Telegram Integration Tests', () => {
  let service: AlertService;
  let configService: ConfigService;

  jest.setTimeout(30000); // 30s timeout untuk API call

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        {
          provide: ConfigService,
          useClass: ConfigService,
        },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
    configService = module.get<ConfigService>(ConfigService);

    const token = configService.get('TELEGRAM_ALERT_BOT_TOKEN');
    const chatId = configService.get('TELEGRAM_ALERT_CHAT_ID');

    if (!token || !chatId) {
      console.log(
        '⚠️ Skipping Telegram integration tests (credentials not configured)',
      );
      return;
    }

    console.log(
      '\n📤 Real Telegram Integration Tests - Akan mengirim pesan ke Telegram Anda\n',
    );
  });

  describe('Real Telegram Delivery', () => {
    it('should send HARD-FAIL alert to Telegram', async () => {
      const token = configService.get('TELEGRAM_ALERT_BOT_TOKEN');
      if (!token) {
        console.log('⏭️  Skipping (Telegram not configured)');
        return;
      }

      console.log(
        '📤 Sending HARD-FAIL alert to Telegram (check your chat)...',
      );

      const customerId = '6281234567890@c.us';
      const sessionName = 'integration-test-hardFail';

      await service.alertHardFailMessage(customerId, sessionName, 100, 1800);

      console.log('✅ HARD-FAIL alert sent to Telegram');
    });

    it('should send ERROR RATE alert to Telegram', async () => {
      const token = configService.get('TELEGRAM_ALERT_BOT_TOKEN');
      if (!token) {
        console.log('⏭️  Skipping (Telegram not configured)');
        return;
      }

      // Wait 2 seconds untuk avoid cooldown
      await new Promise((r) => setTimeout(r, 2000));

      console.log(
        '📤 Sending ERROR RATE alert to Telegram (check your chat)...',
      );

      await service.alertHighErrorRate(8.5, 5, 17, 200, 5);

      console.log('✅ ERROR RATE alert sent to Telegram');
    });

    it('should send LLM HEALTH alert to Telegram', async () => {
      const token = configService.get('TELEGRAM_ALERT_BOT_TOKEN');
      if (!token) {
        console.log('⏭️  Skipping (Telegram not configured)');
        return;
      }

      // Wait 2 seconds untuk avoid cooldown
      await new Promise((r) => setTimeout(r, 2000));

      console.log(
        '📤 Sending LLM HEALTH alert to Telegram (check your chat)...',
      );

      await service.alertLLMHealthIssue(
        'JSON_PARSE',
        5,
        'Unexpected token at position 1',
      );

      console.log('✅ LLM HEALTH alert sent to Telegram');
    });

    it('should send MEMORY alert to Telegram', async () => {
      const token = configService.get('TELEGRAM_ALERT_BOT_TOKEN');
      if (!token) {
        console.log('⏭️  Skipping (Telegram not configured)');
        return;
      }

      // Wait 2 seconds untuk avoid cooldown
      await new Promise((r) => setTimeout(r, 2000));

      console.log(
        '📤 Sending MEMORY USAGE alert to Telegram (check your chat)...',
      );

      await service.alertMemoryIssue(92, 80, 'SPIKE', 1410, 1536);

      console.log('✅ MEMORY USAGE alert sent to Telegram');
    });
  });
});
