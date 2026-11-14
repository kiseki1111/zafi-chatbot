# Test Suite Guide - Aggressive Retry Strategy (100x, 30min max)

## Overview

This test suite verifies the implementation of the "Never Show Error Message" strategy for the omnichannel chatbot retry mechanism.

### Key Test Objectives

1. ✅ **100x Retry Mechanism** - Ensure message retry attempts reach 100 before surrender
2. ✅ **30-Minute Max Duration** - Enforce hard stop at 30 minutes elapsed
3. ✅ **Exponential Backoff** - Verify delays increase (1s, 2s, 4s, 8s, ... max 60s)
4. ✅ **No Error Messages** - CRITICAL: Never send "Maaf, sistem sedang sibuk" to customer
5. ✅ **Anti-Duplication** - Guarantee exactly 1 reply per message
6. ✅ **Silent Failures** - Log failures but don't notify customer

---

## Test Files

### 1. Unit Tests: omnichannel-queue.service.spec.ts
**Location**: `apps/backend/src/core/omnichannel/omnichannel-queue.service.spec.ts`

**What it tests**:
- Message queueing and debouncing (10s)
- Retry mechanism with exponential backoff
- 100x retry limit
- 30-minute duration enforcement
- Human mode bypass
- Anti-duplication guarantee
- **CRITICAL**: Never send error message

**Run**:
```bash
npm run test -- omnichannel-queue.service.spec.ts
```

### 2. E2E Tests: omnichannel-retry.e2e.spec.ts
**Location**: `apps/backend/test/e2e/omnichannel-retry.e2e.spec.ts`

**Test Scenarios**:
- **Scenario 1**: Temporary disruption (success after 3 retries)
- **Scenario 2**: Persistent failure (no error message)
- **Scenario 3**: JSON parse error (retry & recover)
- **Scenario 4**: Timeout then recovery (120s per attempt)
- **Scenario 5**: Multiple concurrent customers (no interference)
- **Scenario 6**: Human mode takeover (skip AI entirely)
- **Scenario 7**: 30-minute window enforcement
- **Anti-Duplication**: Exactly 1 reply
- **Critical Policy**: Never send error message
- **Logging**: Verify proper debug logging

**Run**:
```bash
npm run test:e2e -- omnichannel-retry.e2e.spec.ts
```

### 3. Integration Tests: cs.service-retry.spec.ts
**Location**: `apps/backend/src/features/agent-cs/cs.service-retry.spec.ts`

**What it tests**:
- Invalid JSON handling (throws, not returns message)
- JSON parse error scenarios
- Error propagation to omnichannel service
- Stream mode error handling
- **CRITICAL**: No "sistem sedang sibuk" message returned

**Run**:
```bash
npm run test -- cs.service-retry.spec.ts
```

---

## Running Tests

### All Tests
```bash
npm run test
```

### Specific Test Suite
```bash
npm run test -- omnichannel-queue.service.spec.ts
npm run test -- cs.service-retry.spec.ts
npm run test:e2e -- omnichannel-retry.e2e.spec.ts
```

### Watch Mode (Auto-rerun on changes)
```bash
npm run test -- --watch
```

### Coverage Report
```bash
npm run test -- --coverage
```

### Verbose Output
```bash
npm run test -- --verbose
```

---

## Key Test Cases Explained

### 1. "CRITICAL: NEVER Send Error Message"
```typescript
// Verifies that under ANY failure condition, 
// the message "Maaf, sistem sedang sibuk" is NEVER sent
expect(errorMessagesSent).toHaveLength(0);
```

**Why it matters**: This is the core requirement. Customer should never see error message, even after 30 minutes of retries.

### 2. "Exponential Backoff Verification"
```typescript
// Retry 1:  1 second   (1000 * 2^0)
// Retry 2:  2 seconds  (1000 * 2^1)
// Retry 3:  4 seconds  (1000 * 2^2)
// ...
// Max cap: 60 seconds
```

**Why it matters**: Prevents server overload from rapid retries. Gradually increases wait time.

### 3. "30-Minute Max Duration"
```typescript
const MAX_RETRY_DURATION_MS = 30 * 60 * 1000;
```

**Why it matters**: Hard stop to prevent infinite retries. After 30 minutes, give up silently.

### 4. "Anti-Duplication"
```typescript
// Callback should be called exactly once
expect(replyCallback).toHaveBeenCalledTimes(1);
```

**Why it matters**: Ensure customer never receives duplicate replies from multiple retries.

### 5. "Timeout per Attempt: 120s (not 60s)"
```typescript
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout 120s')), 120000)
);
```

**Why it matters**: Gives server more time to process under heavy load.

---

## Expected Test Results

### Success Criteria

| Test | Expected Result |
|------|-----------------|
| Retry count reaches 100 | ✅ Max 100 retries before stop |
| 30-minute enforcement | ✅ Stops after 30 minutes |
| Exponential backoff | ✅ Delays: 1s, 2s, 4s, 8s... 60s |
| Error message never sent | ✅ 0 occurrences of "sistem sedang sibuk" |
| Anti-duplication | ✅ Exactly 1 reply per message |
| Concurrent messages | ✅ No interference between customers |
| JSON parse error | ✅ Throws error for retry, doesn't return message |

### Sample Output

```
✅ Scenario 1 PASS: Recovered after 4 attempts
✅ Scenario 2 PASS: No error message sent after 10 failed attempts
✅ Scenario 3 PASS: Recovered from JSON error after 2 attempts
✅ Scenario 4 PASS: Timeout handled without error message (2 attempts)
✅ Scenario 5 PASS: 3 concurrent messages processed without interference
✅ Scenario 6 PASS: Human mode correctly bypasses AI
✅ Scenario 7 PASS: 30-minute window enforced correctly
✅ Anti-Duplication PASS: Reply sent exactly once
✅ CRITICAL POLICY VERIFIED: Never send error message (tested 3 customers)
```

---

## Monitoring Logs During Production

When running in production, monitor these logs:

### Successful Recovery
```
[Omnichannel Aggressive-Retry] Pesan 62812345678 di-retry (Attempt 5/100) dalam 8000ms. Durasi elapsed: 30s/1800s...
```

### Hard Failure (After 30min)
```
[Omnichannel HARD-FAIL] Pesan dari 62812345678 gagal diproses setelah 101 retry dalam 1800s. TIDAK MENGIRIM PESAN ERROR KE CUSTOMER (sesuai instruksi untuk never show error message).
```

### JSON Parse Error (Triggering Retry)
```
[CS-BOT] Error parsing LLM JSON: Unexpected token } in JSON at position 45
```

---

## Troubleshooting Failed Tests

### Test Hangs
- Increase Jest timeout: `jest.setTimeout(60000)`
- Check if `done()` callback is called in async tests

### Retry Count Lower Than Expected
- Verify mock service throws errors correctly
- Check timeout values

### Error Message Still Appears
- Search for "sistem sedang sibuk" in all service files
- Verify CS Service throws error instead of returning message

### Concurrent Test Interference
- Ensure each test clears mocks with `jest.clearAllMocks()`
- Each test should use unique sessionName/senderId

---

## Adding New Tests

When adding new test cases:

1. **Add to the appropriate file** (unit, e2e, or integration)
2. **Follow naming convention**: `it('should [behavior] [condition]')`
3. **Mock dependencies** with sensible defaults
4. **Assert the ABSENCE of error messages** as a verification step
5. **Clean up** with `afterEach(() => jest.clearAllMocks())`

Example:
```typescript
it('should handle [scenario] without sending error message', async () => {
  // Setup
  mockCsService.handleMessage.mockImplementation(() => {
    // Simulate behavior
    throw new Error('Specific error');
  });

  // Act
  service.enqueue(message);
  await new Promise(resolve => setTimeout(resolve, duration));

  // Assert
  expect(replyCallback).not.toHaveBeenCalledWith(
    expect.objectContaining({
      text: expect.stringMatching(/sistem sedang sibuk/i)
    })
  );
});
```

---

## Continuous Integration

These tests should run on every commit:

```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm run test

- name: Run E2E Tests
  run: npm run test:e2e

- name: Generate Coverage
  run: npm run test -- --coverage
```

---

## Performance Considerations

- Unit tests: ~5-10 seconds
- E2E tests: ~30-60 seconds (due to timeout simulations)
- All tests: ~2-3 minutes

If tests are slow:
- Reduce Jest timeout for fast tests
- Use `jest.useFakeTimers()` for time-dependent tests
- Run tests in parallel: `npm run test -- --maxWorkers=4`

---

## Safety Checklist

Before deploying to production:

- [ ] All unit tests pass (`npm run test`)
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] Integration tests pass for error handling
- [ ] No "sistem sedang sibuk" appears anywhere
- [ ] Retry count verified to reach 100x
- [ ] 30-minute duration enforced
- [ ] Exponential backoff verified
- [ ] Anti-duplication confirmed
- [ ] Coverage > 80% for critical paths
- [ ] Logs show proper retry messages

---

## Questions or Issues?

If tests fail or behave unexpectedly:

1. Check test logs for specific failure message
2. Verify mocks are set up correctly
3. Review test comments for expected behavior
4. Run in verbose mode: `npm run test -- --verbose`
5. Check if code changes match test expectations

---

**Last Updated**: November 14, 2026
**Test Suite Version**: 1.0
**Strategy**: Never Show Error Message (100x, 30min, Exponential Backoff)
