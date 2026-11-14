# 📱 Telegram Alert Testing Guide

**Objective**: Trigger real Telegram notifications untuk verify semua alert types berfungsi

---

## 🚀 Quick Test: Trigger Semua Alerts Sekaligus

```bash
curl -X POST http://localhost:3000/api/v1/monitoring/test-trigger/all
```

Response:
```json
{
  "status": "completed",
  "message": "✅ Semua alerts dikirim - check Telegram Anda!",
  "results": [
    "✅ HARD-FAIL sent",
    "✅ ERROR_RATE sent",
    "✅ LLM_HEALTH (JSON_PARSE) sent",
    "✅ MEMORY (SPIKE) sent"
  ]
}
```

**Expected**: Anda akan menerima 4 notifikasi di Telegram dalam beberapa detik.

---

## 🎯 Individual Alert Triggers

### 1️⃣ HARD-FAIL Message Alert

**Trigger ketika**: Customer tidak menerima respons setelah 30 menit retry

```bash
curl -X POST "http://localhost:3000/api/v1/monitoring/test-trigger/hard-fail"
```

**Dengan custom parameters:**
```bash
curl -X POST "http://localhost:3000/api/v1/monitoring/test-trigger/hard-fail?customerId=6281234567890@c.us&sessionName=test-session&retryCount=100&elapsedSeconds=1800"
```

**Expected Telegram Message:**
```
⚠️ [HARD-FAIL MESSAGE]

👤 Customer: 6281234567890@c.us
📱 Session: test-session
🔄 Attempts: 100x
⏱️ Duration: 30m

❌ Status: FAILED (no response sent)
🔗 Action: Check logs & investigate
⏰ Time: [Current Time] WIB
```

---

### 2️⃣ HIGH ERROR RATE Alert

**Trigger ketika**: Error rate > 5% dalam 5 menit terakhir

```bash
curl -X POST "http://localhost:3000/api/v1/monitoring/test-trigger/error-rate"
```

**Dengan custom parameters (8.5% error rate):**
```bash
curl -X POST "http://localhost:3000/api/v1/monitoring/test-trigger/error-rate?errorRate=8.5&threshold=5&failedCount=17&totalCount=200"
```

**Expected Telegram Message:**
```
🔴 [HIGH ERROR RATE]

📊 Error Rate: 8.50% (Threshold: 5%)
❌ Failed Messages: 17/200
⏱️ Period: Last 5 minutes

🚨 Severity: HIGH
🔗 Action: Check logs for error patterns
⏰ Time: [Current Time] WIB
```

---

### 3️⃣ LLM HEALTH ISSUE Alert

**Trigger ketika**: 5 consecutive LLM failures

#### Test JSON_PARSE failure:
```bash
curl -X POST "http://localhost:3000/api/v1/monitoring/test-trigger/llm-health?failureType=JSON_PARSE&consecutiveFailures=5"
```

#### Test SERVICE_DOWN:
```bash
curl -X POST "http://localhost:3000/api/v1/monitoring/test-trigger/llm-health?failureType=SERVICE_DOWN&consecutiveFailures=10"
```

#### Test TIMEOUT:
```bash
curl -X POST "http://localhost:3000/api/v1/monitoring/test-trigger/llm-health?failureType=TIMEOUT&consecutiveFailures=5"
```

#### Test RATE_LIMIT:
```bash
curl -X POST "http://localhost:3000/api/v1/monitoring/test-trigger/llm-health?failureType=RATE_LIMIT&consecutiveFailures=8"
```

**Expected Telegram Messages:**

**JSON_PARSE:**
```
⚠️ [LLM HEALTH ISSUE]

❌ Issue Type: Invalid JSON response dari LLM
📈 Consecutive Failures: 5
📝 Last Error: Expected property name at position 1

🔗 Action: Switch to fallback LLM if available
⏰ Time: [Current Time] WIB
```

**SERVICE_DOWN:**
```
🚨 [LLM HEALTH ISSUE]

❌ Issue Type: LLM service tidak merespons
📈 Consecutive Failures: 10

🔗 Action: Switch to fallback LLM if available
⏰ Time: [Current Time] WIB
```

---

### 4️⃣ MEMORY USAGE Alert

**Trigger ketika**: Memory > 80% atau spike > 10%

#### Test SPIKE (sudden increase):
```bash
curl -X POST "http://localhost:3000/api/v1/monitoring/test-trigger/memory?trend=SPIKE&usagePercent=92"
```

#### Test TRENDING_UP (gradually increasing):
```bash
curl -X POST "http://localhost:3000/api/v1/monitoring/test-trigger/memory?trend=TRENDING_UP&usagePercent=85"
```

#### Test STABLE_HIGH (consistently high):
```bash
curl -X POST "http://localhost:3000/api/v1/monitoring/test-trigger/memory?trend=STABLE_HIGH&usagePercent=85"
```

**Expected Telegram Messages:**

**SPIKE (Critical):**
```
🚨 [MEMORY USAGE ALERT]

💾 Current Usage: 92.0% (Threshold: 80%)
📊 Heap Usage: 1410MB / 1536MB
📈 Trend: ⚡ Sudden spike detected

⚠️ Risk: Possible memory leak or high load
🔗 Action: Monitor closely, consider restart if > 90%
⏰ Time: [Current Time] WIB
```

**TRENDING_UP (Warning):**
```
⚠️ [MEMORY USAGE ALERT]

💾 Current Usage: 85.0% (Threshold: 80%)
📊 Heap Usage: 1310MB / 1536MB
📈 Trend: 📈 Memory trending up

⚠️ Risk: Possible memory leak or high load
🔗 Action: Monitor closely, consider restart if > 90%
⏰ Time: [Current Time] WIB
```

---

## 📋 Testing Checklist

### Setup Phase
- [ ] Verify `.env` has `TELEGRAM_ALERT_BOT_TOKEN` dan `TELEGRAM_ALERT_CHAT_ID`
- [ ] Run app: `npm run dev`
- [ ] App should log: `✅ Alert service initialized` atau `⚠️ Telegram alert tidak dikonfigurasi`

### Manual Testing
- [ ] Run `/api/v1/monitoring/test-trigger/all` endpoint
- [ ] Verify 4 Telegram messages received within 5 seconds
- [ ] Check that message formatting is correct (HTML bold, emoji, etc)
- [ ] Verify timestamps are in Jakarta timezone (WIB)

### Individual Alert Testing
- [ ] Test HARD-FAIL alert dengan `/api/v1/monitoring/test-trigger/hard-fail`
- [ ] Test ERROR-RATE alert dengan `/api/v1/monitoring/test-trigger/error-rate`
- [ ] Test LLM-HEALTH alert dengan semua failure types (JSON_PARSE, SERVICE_DOWN, TIMEOUT, RATE_LIMIT)
- [ ] Test MEMORY alert dengan semua trends (SPIKE, TRENDING_UP, STABLE_HIGH)

### Cooldown Testing
- [ ] Send alert tipe A
- [ ] Try send same alert tipe A immediately → should be throttled
- [ ] Wait 61 seconds
- [ ] Send same alert tipe A → should succeed
- [ ] Send alert tipe B immediately → should succeed (different type, no throttle)

### Edge Cases
- [ ] Test with missing Telegram config → should gracefully skip
- [ ] Test with invalid bot token → should log error but not crash
- [ ] Test with network timeout → should be handled gracefully

---

## 🔍 Troubleshooting

### ❌ Pesan tidak masuk ke Telegram

**1. Verify Configuration:**
```bash
# Check environment variables
grep TELEGRAM .env
```

Expected output:
```
TELEGRAM_ALERT_BOT_TOKEN=9234474897:AAG8iQYDkwdmeRjOKB53tLhP_GUTg0mY-xI
TELEGRAM_ALERT_CHAT_ID=6251368640
```

**2. Check Bot Status:**
- Open Telegram
- Find your bot (@botname)
- Send `/start` untuk ensure bot is active
- Verify chat_id is correct

**3. Check Server Logs:**
```bash
npm run dev | grep -i alert
```

Expected:
```
[AlertService] ✅ Alert sent: hard-fail
```

Errors:
```
[AlertService] ❌ Telegram alert error: Network error
[AlertService] ⚠️ Telegram alert tidak dikonfigurasi
```

**4. Manual Test:**
```bash
# Trigger alert
curl -X POST http://localhost:3000/api/v1/monitoring/test-trigger/hard-fail

# Check response
# Should return 200 OK with success message
```

---

## 📊 Health Check Endpoints

### System Health
```bash
curl http://localhost:3000/api/v1/monitoring/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-11-14T16:51:45.123Z",
  "metrics": {
    "messages": {
      "total": 1250,
      "success": 1225,
      "failed": 25,
      "errorRate": "2.00%"
    },
    "memory": {
      "heapUsedMB": 1270,
      "heapMaxMB": 1536,
      "percentUsed": "82.7%",
      "rss": "1450MB"
    }
  },
  "alerts": {
    "errorRateThreshold": 5,
    "memoryThreshold": 80,
    "llmFailureThreshold": 5
  }
}
```

### Simple Ping
```bash
curl http://localhost:3000/api/v1/monitoring/ping
```

---

## 🚀 Automated Alert Triggers (Real Scenarios)

### Hard-Fail Alert
**Triggers automatically when:**
- Customer message fails to get response after 100 retries over 30 minutes
- Location: `omnichannel-queue.service.ts`

**To trigger in dev:**
```bash
# Simulate by modifying max retry duration or count in code temporarily
```

### LLM Health Alert
**Triggers automatically when:**
- 5 consecutive JSON parse errors from LLM
- Location: `cs.service.ts` - LLM failure tracking

**To trigger in dev:**
1. Mock LLM to return invalid JSON 5 times
2. Alert will be sent automatically

### Error Rate Alert
**Triggers automatically when:**
- Error rate > 5% in last 5 minutes
- Location: `metrics.service.ts` - sliding window calculation

**To trigger in dev:**
1. Simulate message processing failures
2. Alert will be sent when threshold exceeded

### Memory Alert
**Triggers automatically when:**
- Memory usage > 80% heap
- Memory spike > 10% suddenly
- Checked every 5 seconds via cron job

**To trigger in dev:**
1. Run memory-intensive operation
2. Alert will be sent automatically

---

## 📝 Test Results Template

```markdown
# Alert Testing Results - [DATE]

## All Alerts Triggered
- [ ] HARD-FAIL Alert
- [ ] ERROR RATE Alert  
- [ ] LLM HEALTH (JSON_PARSE) Alert
- [ ] LLM HEALTH (SERVICE_DOWN) Alert
- [ ] MEMORY (SPIKE) Alert
- [ ] MEMORY (TRENDING_UP) Alert
- [ ] MEMORY (STABLE_HIGH) Alert

## Message Quality
- [ ] HTML formatting correct (bold, code blocks)
- [ ] Emoji showing correctly
- [ ] Timestamps in Jakarta timezone (WIB)
- [ ] All required details present

## Telegram Delivery
- [ ] Messages received in < 5 seconds
- [ ] No duplicates sent
- [ ] Cooldown mechanism working (no spam)

## Production Ready
- [ ] ✅ PASSED - Ready for deployment
```

---

## 🎉 Next Steps

After verifying all alerts:

1. ✅ Commit changes to git
2. ✅ Deploy to staging
3. ✅ Monitor Telegram messages for 24 hours
4. ✅ Deploy to production
5. ✅ Setup monitoring dashboard

---

**Last Updated**: 2026-11-14
**Status**: ✅ Complete & Tested
