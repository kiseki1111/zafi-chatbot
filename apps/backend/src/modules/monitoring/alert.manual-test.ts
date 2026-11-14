/**
 * Manual Test Script untuk Telegram Alert Notifications
 * Trigger real notifications ke Telegram untuk testing
 *
 * Usage:
 *   npx ts-node src/modules/monitoring/alert.manual-test.ts
 */

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AlertService } from './alert.service';
import { AppModule } from '../../app.module';

async function runManualTests() {
  console.log('🚀 Starting Manual Alert Notification Tests...\n');

  // Initialize app untuk get AlertService
  const app = await NestFactory.create(AppModule);
  const alertService = app.get(AlertService);
  const configService = app.get(ConfigService);

  // Verify Telegram config
  const token = configService.get('TELEGRAM_ALERT_BOT_TOKEN');
  const chatId = configService.get('TELEGRAM_ALERT_CHAT_ID');

  if (!token || !chatId) {
    console.error('❌ TELEGRAM_ALERT_BOT_TOKEN atau TELEGRAM_ALERT_CHAT_ID tidak dikonfigurasi');
    process.exit(1);
  }

  console.log('✅ Telegram Configuration Found');
  console.log(`   Bot Token: ${token.substring(0, 20)}...`);
  console.log(`   Chat ID: ${chatId}\n`);

  try {
    // Test 1: Hard-Fail Alert
    console.log('📤 Test 1: Mengirim HARD-FAIL MESSAGE Alert...');
    await alertService.alertHardFailMessage(
      '6281234567890@c.us',
      'test-session-hardFail',
      100,
      1800,
    );
    console.log('✅ Hard-Fail alert terkirim!\n');

    // Wait 1 second sebelum next alert (untuk lihat spread)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 2: Error Rate Alert
    console.log('📤 Test 2: Mengirim HIGH ERROR RATE Alert...');
    await alertService.alertHighErrorRate(8.5, 5, 17, 200, 5);
    console.log('✅ Error Rate alert terkirim!\n');

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 3: LLM Health Alert - JSON_PARSE
    console.log('📤 Test 3: Mengirim LLM HEALTH ISSUE Alert (JSON_PARSE)...');
    await alertService.alertLLMHealthIssue(
      'JSON_PARSE',
      5,
      'Expected property name at position 1',
    );
    console.log('✅ LLM Health (JSON_PARSE) alert terkirim!\n');

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 4: LLM Health Alert - SERVICE_DOWN
    console.log('📤 Test 4: Mengirim LLM HEALTH ISSUE Alert (SERVICE_DOWN)...');
    await alertService.alertLLMHealthIssue('SERVICE_DOWN', 10);
    console.log('✅ LLM Health (SERVICE_DOWN) alert terkirim!\n');

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 5: Memory Alert - SPIKE
    console.log('📤 Test 5: Mengirim MEMORY USAGE Alert (SPIKE)...');
    await alertService.alertMemoryIssue(92, 80, 'SPIKE', 1410, 1536);
    console.log('✅ Memory (SPIKE) alert terkirim!\n');

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 6: Memory Alert - TRENDING_UP
    console.log('📤 Test 6: Mengirim MEMORY USAGE Alert (TRENDING_UP)...');
    await alertService.alertMemoryIssue(85, 80, 'TRENDING_UP', 1310, 1536);
    console.log('✅ Memory (TRENDING_UP) alert terkirim!\n');

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 7: Memory Alert - STABLE_HIGH
    console.log('📤 Test 7: Mengirim MEMORY USAGE Alert (STABLE_HIGH)...');
    await alertService.alertMemoryIssue(85, 80, 'STABLE_HIGH', 1310, 1536);
    console.log('✅ Memory (STABLE_HIGH) alert terkirim!\n');

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 8: Generic Alert
    console.log('📤 Test 8: Mengirim GENERIC Alert...');
    await alertService.sendAlert({
      title: 'Manual Test Alert',
      severity: 'HIGH',
      details: {
        'Test Type': 'Manual Telegram Test',
        'Status': 'Berhasil Terkirim',
        'Timestamp': new Date().toISOString(),
      },
    });
    console.log('✅ Generic alert terkirim!\n');

    console.log('='.repeat(60));
    console.log('✅ Semua 8 test alerts telah dikirim ke Telegram!');
    console.log('📱 Periksa Telegram Anda untuk menerima 8 notifikasi');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ Error mengirim alerts:', error);
  } finally {
    await app.close();
    process.exit(0);
  }
}

runManualTests();
