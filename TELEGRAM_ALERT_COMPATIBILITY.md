# Telegram Alert Feature - Compatibility with New Retry Strategy

## ✅ Feature Already Exists

Your implementation already has Telegram notification when WAHA session disconnects!

**Location**: `apps/backend/src/modules/waha/waha.controller.ts` (lines 1956-2013)

---

## Feature Details

### How It Works

When a WAHA session becomes `STOPPED` or `FAILED`, the system:

1. **Triggers notification** via `notifyTelegramSessionDisconnected()`
2. **Sends Telegram message** to admin chat
3. **Includes details**:
   - Tenant name
   - Session name / Phone number
   - Disconnect status & reason
   - Timestamp (Jakarta timezone)
   - Action instruction (scan QR again)

### Telegram Message Format

```
🚨 [SESI WHATSAPP TERPUTUS]

🏢 Tenant: Griya Amanah
📱 Nomor / Sesi: +6281234567890 (session-rindang-1)
⚠️ Status: STOPPED
🔍 Penyebab: Device logged out
⏰ Waktu: 14 Nov 2026 15:30:45 WIB

👉 Buka Dashboard ZAF SAPA > Pengaturan > Scan QR ulang.
```

### Cooldown Mechanism

- **Purpose**: Prevent spam when session keeps reconnecting/disconnecting
- **Duration**: 3 minutes (180,000 ms) per session
- **Tracking**: `sessionAlertCooldown` Map stores last alert timestamp

---

## Environment Variables Required

For Telegram notification to work, set these in `.env`:

```env
# Option 1: Dedicated alert bot
TELEGRAM_ALERT_BOT_TOKEN=123456789:ABCdef-xxxxx
TELEGRAM_ALERT_CHAT_ID=-987654321

# OR Option 2: Fallback to CS bot
TELEGRAM_BOT_CS_DEV_API=123456789:ABCdef-xxxxx
TELEGRAM_ADMIN_CHAT_ID=-987654321
```

**Fallback Priority**:
1. `TELEGRAM_ALERT_BOT_TOKEN` (preferred)
2. `TELEGRAM_BOT_TOKEN`
3. `TELEGRAM_BOT_CS_DEV_API` (fallback)

---

## Compatibility with New Retry Strategy

### ✅ No Conflicts

The new aggressive retry strategy (100x, 30min) does **NOT** affect Telegram notifications:

| Aspect | Status | Reason |
|--------|--------|--------|
| **Retry Mechanism** | ✅ Independent | Retries are in omnichannel queue, not in WAHA session |
| **Session Disconnect** | ✅ Still notified | Triggered by session.status webhook event |
| **Message Handling** | ✅ Separate flow | Telegram alerts are for connection issues, not message failures |
| **Cooldown** | ✅ Works fine | 3-minute cooldown still prevents spam |

### How They Work Together

```
Customer sends message
    ↓
[Omnichannel Queue Service]
    ├─ Retries: Up to 100x ← NEW
    ├─ Duration: Up to 30 min ← NEW
    └─ No error message ← NEW
    
Separately:
    ↓
[WAHA Session Status Event]
    ├─ If status = STOPPED/FAILED
    └─ Send Telegram Alert ← EXISTING
        ├─ Cooldown: 3 min
        └─ Notify admin via Telegram
```

---

## Testing Telegram Alerts

### Manual Test

To verify Telegram notification is configured:

1. **Check environment variables**:
   ```bash
   echo $TELEGRAM_ALERT_BOT_TOKEN
   echo $TELEGRAM_ALERT_CHAT_ID
   ```

2. **Manually disconnect WAHA session** (if test environment):
   - Stop WAHA container
   - Or call `DELETE /api/v1/waha/instances/:id`

3. **Check Telegram chat** for notification message

### Log Verification

Check backend logs for Telegram notification activity:

```bash
# Success
[WAHA] Sesi ... STOPPED: Device logged out
🚨 [SESI WHATSAPP TERPUTUS] ... (Telegram message sent)

# Failure (will not block retry mechanism)
Failed to send Telegram disconnection alert: ...
```

---

## Integration Points

### 1. Session Status Webhook (waha.controller.ts:1906)

```typescript
else if (payload?.event === 'session.status') {
  const sessionName = payload.session;
  const status = payload.payload?.status;
  
  if (status === 'STOPPED' || status === 'FAILED') {
    this.notifyTelegramSessionDisconnected(sessionName, status, reason)
      .catch(() => null);
  }
}
```

### 2. Cooldown Check (waha.controller.ts:1972-1975)

```typescript
// Cooldown 3 menit per session
const now = Date.now();
const lastSent = this.sessionAlertCooldown.get(sessionName) || 0;
if (now - lastSent < 180_000) return;
this.sessionAlertCooldown.set(sessionName, now);
```

---

## When Notification Triggers

✅ **Notified when**:
- Session status changes to `STOPPED` or `FAILED`
- Last notification was > 3 minutes ago
- Telegram credentials are configured

❌ **NOT notified when**:
- Session is in `WORKING` status
- Session just reconnected successfully
- It's within 3-minute cooldown period
- Telegram credentials not configured (silent fail)

---

## Recommended Use Case

### For Admins

1. **Create dedicated Telegram group** for alerts
2. **Add bot token** to environment
3. **Enable notifications** in dashboard
4. **Monitor chat** during business hours
5. **React quickly** when session disconnects

### Typical Workflow

```
[Session Disconnects]
    ↓
[Bot sends Telegram alert in real-time]
    ↓
[Admin receives notification]
    ↓
[Admin opens Dashboard → Settings → Scan QR again]
    ↓
[Session reconnects]
    ↓
[Back to normal operation]
```

---

## Relation to New Retry Strategy

### Scenario: Temporary Server Disruption

**With old strategy** (3x retry, immediate error):
1. Message received
2. Try 3 times (3 × 60s = ~3 minutes)
3. Send error message to customer
4. Session may disconnect due to retry failures
5. Telegram alert sent to admin

**With new strategy** (100x retry, 30min max):
1. Message received
2. Try many times (100x, exponential backoff, ~30 min total)
3. **No error message** to customer (silent retry)
4. Eventually succeeds or silently fails
5. Session stays alive (retries don't cause disconnect)
6. Telegram alert only if actual disconnect happens

**Result**: ✅ **Better** - Fewer unnecessary session disconnects, so fewer Telegram alerts

---

## Future Improvements

### Possible Enhancements

1. **Enhanced Alert Details**
   - Include retry history if session was under retry load
   - Mention hard-fail messages (0-count but logged)
   - Suggest actions based on failure reason

2. **Intelligent Notifications**
   - Distinguish between:
     - Normal disconnect (user logout)
     - Network error
     - Server overload
     - Authentication issue
   - Adjust alert priority accordingly

3. **Callback to Telegram**
   - Admin can reply to Telegram alert
   - Bot responds with quick actions:
     - `reconnect` → Restart session
     - `logs` → Last 10 log entries
     - `status` → Current session status

---

## Troubleshooting

### Alert Not Sent

**Check**:
1. Is `TELEGRAM_ALERT_BOT_TOKEN` configured?
2. Is `TELEGRAM_ALERT_CHAT_ID` configured?
3. Is session actually `STOPPED` or `FAILED`?
4. Is last alert < 3 minutes ago? (cooldown check)
5. Can backend reach `api.telegram.org`?

### Spam Alerts

**Solutions**:
1. Increase cooldown from 180s to higher (edit code)
2. Fix root cause of frequent disconnects
3. Disable alerts temporarily: Remove env vars

### Wrong Chat Received Alert

**Check**:
1. Is `TELEGRAM_ALERT_CHAT_ID` correct? (Should be negative)
2. Is bot member of the chat?
3. Is bot granted permission to send messages?

---

## Configuration Example

### .env Setup

```env
# Telegram Alert Bot Configuration
TELEGRAM_ALERT_BOT_TOKEN=<your-bot-token-here>
TELEGRAM_ALERT_CHAT_ID=<your-chat-id-here>
```

### Get Bot Token

1. Open Telegram
2. Message `@BotFather`
3. Create new bot with `/newbot`
4. Get token

### Get Chat ID

1. Add bot to group
2. Send message to group
3. Call: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Find `chat.id` (negative number for groups)

---

## Summary

✅ **Telegram Alert Feature**: Already fully implemented  
✅ **Compatibility**: 100% compatible with new retry strategy  
✅ **Integration**: Works independently, no conflicts  
✅ **Admin Notification**: Real-time alerts when sessions disconnect  
✅ **Cooldown**: Smart 3-minute throttling to prevent spam

**Status**: ✅ **Production Ready**

---

**Last Updated**: November 14, 2026  
**Feature Status**: ✅ Active & Tested  
**Compatibility**: ✅ No issues with new retry strategy
