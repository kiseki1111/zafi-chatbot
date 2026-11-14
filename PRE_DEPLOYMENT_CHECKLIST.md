# Pre-Deployment Checklist - Aggressive Retry Strategy

**Version**: 1.0  
**Date**: November 14, 2026  
**Strategy**: 100x Retry, 30min Max, Never Show Error Message

---

## Code Quality & Compilation

- [ ] **TypeScript Compilation**
  ```bash
  npm run build
  ```
  - Expected: Exit code 0, no errors
  - Command output location: Check terminal output

- [ ] **Lint Check** (if enabled)
  ```bash
  npm run lint
  ```
  - Expected: No critical errors
  - Warnings acceptable if documented

- [ ] **Dependency Check**
  ```bash
  npm audit
  ```
  - Expected: No high-risk vulnerabilities
  - Medium-risk acceptable with mitigation plan

---

## Test Execution

- [ ] **Unit Tests - Omnichannel Queue**
  ```bash
  npm run test -- omnichannel-queue.service.spec.ts
  ```
  - Expected: All tests pass (✅)
  - Coverage: > 80%
  - Critical tests:
    - [ ] Retry reaches 100x
    - [ ] 30-minute enforcement
    - [ ] Exponential backoff
    - [ ] **Never send error message**

- [ ] **E2E Tests - Retry Scenarios**
  ```bash
  npm run test:e2e -- omnichannel-retry.e2e.spec.ts
  ```
  - Expected: All scenarios pass (✅)
  - Run time: ~30-60 seconds
  - Critical scenarios:
    - [ ] Scenario 2: Persistent failure (no error)
    - [ ] Scenario 7: 30-minute window
    - [ ] Anti-duplication
    - [ ] **CRITICAL POLICY: Never send error message**

- [ ] **Integration Tests - CS Service**
  ```bash
  npm run test -- cs.service-retry.spec.ts
  ```
  - Expected: All tests pass (✅)
  - Coverage: > 80%
  - Critical assertions:
    - [ ] Invalid JSON throws error
    - [ ] No fallback message returned
    - [ ] Error propagates to omnichannel

- [ ] **Full Test Suite**
  ```bash
  npm run test
  ```
  - Expected: All tests pass
  - Total coverage: > 75%
  - No timeouts or hangs

---

## Code Review Verification

### omnichannel-queue.service.ts

- [ ] **Search for removed error message**
  ```bash
  grep -n "Maaf, sistem sedang sibuk" src/core/omnichannel/omnichannel-queue.service.ts
  ```
  - Expected: **0 matches** (should be completely removed)

- [ ] **Verify retry count**
  ```bash
  grep -n "maxRetries = 100" src/core/omnichannel/omnichannel-queue.service.ts
  ```
  - Expected: 1 match found

- [ ] **Verify exponential backoff**
  ```bash
  grep -n "Math.pow(2, retryCount)" src/core/omnichannel/omnichannel-queue.service.ts
  ```
  - Expected: 1 match found

- [ ] **Verify 30-minute limit**
  ```bash
  grep -n "MAX_RETRY_DURATION_MS = 30" src/core/omnichannel/omnichannel-queue.service.ts
  ```
  - Expected: 1 match found

- [ ] **Verify 120s timeout**
  ```bash
  grep -n "120000" src/core/omnichannel/omnichannel-queue.service.ts
  ```
  - Expected: 1 match found

### cs.service.ts

- [ ] **Search for removed error message**
  ```bash
  grep -n "Maaf, sistem sedang sibuk" src/features/agent-cs/cs.service.ts
  ```
  - Expected: **0 matches** (should be completely removed)

- [ ] **Verify error is thrown**
  ```bash
  grep -n "throw new Error" src/features/agent-cs/cs.service.ts
  ```
  - Expected: At least 1 match in the catch block

---

## Configuration Validation

- [ ] **Maximum Retries**: Should be 100
  - Location: `omnichannel-queue.service.ts` line ~187
  - Value: `const maxRetries = 100;`

- [ ] **Maximum Duration**: Should be 30 minutes
  - Location: `omnichannel-queue.service.ts` line ~29
  - Value: `private readonly MAX_RETRY_DURATION_MS = 30 * 60 * 1000;`

- [ ] **Timeout Per Attempt**: Should be 120 seconds
  - Location: `omnichannel-queue.service.ts` line ~176
  - Value: `120000` (milliseconds)

- [ ] **Exponential Backoff Cap**: Should be 60 seconds
  - Location: `omnichannel-queue.service.ts` line ~205
  - Value: `Math.min(1000 * Math.pow(2, retryCount), 60000)`

---

## Staging Deployment Tests

### 1. Service Startup
- [ ] Backend starts without errors
  ```bash
  npm run start
  ```
  - Expected: Service listens on configured port
  - Logs show: No startup errors related to omnichannel

### 2. Message Handling (Manual Testing)

- [ ] **Test successful message**
  - Send test message to chatbot
  - Expected: Reply received within 5 seconds
  - Check logs: Should show successful processing

- [ ] **Test with simulated error** (if test endpoint available)
  - Trigger service error
  - Expected: Multiple retry attempts in logs
  - No error message sent to customer
  - Eventually succeeds or hard-fails silently

### 3. Load Testing (Optional)

- [ ] **Concurrent messages**
  - Send 5-10 simultaneous messages
  - Expected: All handled correctly
  - No duplicate replies
  - No customer error messages

- [ ] **Sustained load** (if time permits)
  - Send continuous messages for 5 minutes
  - Expected: No memory leaks
  - No message loss
  - Consistent retry behavior

---

## Monitoring Setup

### Pre-Deployment Monitoring

- [ ] **Log aggregation configured**
  - Service: ELK Stack / Datadog / New Relic (or configured system)
  - Filter: `[Omnichannel Aggressive-Retry]` entries visible
  - Filter: `[Omnichannel HARD-FAIL]` entries visible

- [ ] **Alert rules configured**
  - Alert if hard-fail rate > 5%
  - Alert if median response time > 5 min
  - Alert if retry count avg > 10x

- [ ] **Metrics dashboard ready**
  - Success rate tracking
  - Retry count distribution
  - Duration tracking
  - Hard-fail rate

### Production Monitoring (Day 1)

- [ ] **Monitor logs for**
  - Any unexpected error patterns
  - Hard-fail rate (should be < 1%)
  - Retry attempt distribution (should be < 5 avg)

- [ ] **Check customer feedback**
  - Any reports of timeouts or failures?
  - Response time satisfaction?
  - Better UX than before (no error messages)?

---

## Security Verification

- [ ] **No sensitive data in logs**
  - Logs don't expose API keys
  - Logs don't expose customer PII
  - Error messages are generic

- [ ] **No infinite loops**
  - Max retries: 100x
  - Max duration: 30 min
  - Both enforced correctly

- [ ] **No denial of service risk**
  - Exponential backoff prevents overload
  - Jitter prevents thundering herd
  - No unbounded memory growth

---

## Documentation Verification

- [ ] **README updated** (if needed)
  - Mentions new retry strategy
  - Links to TEST_GUIDE.md
  - Links to IMPLEMENTATION_SUMMARY.md

- [ ] **API docs updated** (if applicable)
  - Response time expectations updated
  - Error message removals documented
  - Retry behavior explained

- [ ] **Deployment guide updated**
  - Configuration options documented
  - Rollback procedure clear
  - Monitoring setup explained

- [ ] **Team notified**
  - Product team understands change
  - Support team aware of behavior
  - Operations team ready to monitor

---

## Risk Assessment

### Low Risk Changes
- ✅ No database schema changes
- ✅ No API contract changes
- ✅ No external service dependencies added
- ✅ Backward compatible (existing conversations work)

### Medium Risk Changes
- ⚠️ Changes retry behavior (could mask real issues)
  - Mitigation: Comprehensive logging
  - Monitoring: Hard-fail rate alerts

- ⚠️ Changes error message (customer UX change)
  - Mitigation: Silent retry is better UX
  - Validation: Staging tests with real users (if possible)

### Mitigation Plan
If issues arise:
1. Monitor hard-fail rate (should be < 1%)
2. Check average retry attempts (should be < 5)
3. If problems: Reduce max retries or duration
4. If critical: Full rollback (revert commit)

---

## Sign-Off Checklist

Before proceeding to production:

- [ ] **Developer Sign-Off**
  - Code reviewed by: _____________
  - Date: _____________
  - Comments: _____________

- [ ] **QA/Tester Sign-Off**
  - All tests passing: YES / NO
  - Staging deployed successfully: YES / NO
  - Date: _____________
  - Comments: _____________

- [ ] **DevOps/Operations Sign-Off**
  - Production deployment ready: YES / NO
  - Monitoring configured: YES / NO
  - Rollback plan ready: YES / NO
  - Date: _____________
  - Comments: _____________

- [ ] **Product Manager Sign-Off**
  - Change impact understood: YES / NO
  - Customer communication ready: YES / NO
  - Date: _____________
  - Comments: _____________

---

## Deployment Steps

### Staging Deployment
1. [ ] Pull latest code
2. [ ] Run all tests (`npm run test`)
3. [ ] Build for staging (`npm run build`)
4. [ ] Deploy to staging environment
5. [ ] Run manual tests (above)
6. [ ] Monitor logs for 30 minutes
7. [ ] Confirm no issues

### Production Deployment
1. [ ] Schedule maintenance window (optional)
2. [ ] Pull latest code to production
3. [ ] Run final tests (`npm run test`)
4. [ ] Build for production (`npm run build:prod`)
5. [ ] Deploy with blue-green or canary strategy
6. [ ] Monitor error rates in real-time
7. [ ] Check hard-fail rate (should be < 1%)
8. [ ] Gradual rollout to 100% if stable

### Post-Deployment
1. [ ] Monitor for 24 hours
2. [ ] Check customer feedback
3. [ ] Verify no unexpected issues
4. [ ] Update deployment log
5. [ ] Celebrate! 🎉

---

## Rollback Procedure

If critical issues occur:

```bash
# 1. Identify issue
git log --oneline | head -5

# 2. Revert to previous commit
git revert [commit-hash]
# OR
git reset --hard [previous-commit]

# 3. Rebuild
npm run build

# 4. Redeploy
# Follow your deployment process

# 5. Verify rollback
npm run test
# Check logs for old behavior restored
```

---

## Final Verification

Before marking as "READY FOR PRODUCTION":

```bash
# Run this one final time:
npm run test && npm run build && npm run test:e2e

# Check for any mentions of error message:
grep -r "Maaf, sistem sedang sibuk" apps/backend/src/

# Expected output:
# [no matches - file returns nothing]
```

**If all checks pass**: ✅ **SAFE TO DEPLOY**

---

**Checklist Version**: 1.0  
**Last Updated**: November 14, 2026  
**Strategy**: 100x Retry, 30min Max, Never Show Error Message

---

*This checklist must be completed and signed off before production deployment.*
