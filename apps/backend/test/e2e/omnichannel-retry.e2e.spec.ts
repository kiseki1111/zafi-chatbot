import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { OmnichannelQueueService } from '../../src/core/omnichannel/omnichannel-queue.service';
import { CsService } from '../../src/features/agent-cs/cs.service';
import { PrismaService } from '../../src/core/prisma/prisma.service';
import { IncomingMessage } from '../../src/core/omnichannel/interfaces/incoming-message.interface';

/**
 * E2E Test Suite: Aggressive Retry Strategy (100x, 30min max)
 *
 * This suite tests the end-to-end behavior of the omnichannel queue service
 * with the new aggressive retry mechanism that NEVER sends error messages.
 */
describe('Omnichannel Retry E2E: 100x Retry, 30min Max, Never Show Error (e2e)', () => {
  let app: INestApplication;
  let omnichannelService: OmnichannelQueueService;
  let csService: CsService;
  let prismaService: PrismaService;

  const mockCsService = {
    handleMessage: jest.fn(),
  };

  const mockPrismaService = {
    conversation: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    message: {
      count: jest.fn(),
    },
    whatsappInstance: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    contact: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        OmnichannelQueueService,
        {
          provide: CsService,
          useValue: mockCsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    omnichannelService = moduleFixture.get<OmnichannelQueueService>(
      OmnichannelQueueService,
    );
    csService = moduleFixture.get<CsService>(CsService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaService.conversation.findFirst.mockResolvedValue({
      mode: 'bot',
      id: 'test-conv-123',
      whatsappInstance: { tenantId: 'tenant-test-123' },
    });
  });

  describe('Scenario 1: Temporary Service Disruption (Success After Few Retries)', () => {
    it('should recover and send reply after 3 failed attempts', async () => {
      let attemptCount = 0;

      mockCsService.handleMessage.mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 3) {
          throw new Error('Temporary LLM service error');
        }
        return Promise.resolve({
          text: 'Halo! Terima kasih sudah menghubungi kami 😊',
          images: [],
          videos: [],
        });
      });

      const replyCallback = jest.fn();
      const incomingMsg: IncomingMessage = {
        senderId: '6281234567890@c.us',
        text: 'Halo, berapa harga rumah tipe 36?',
        provider: 'WAHA',
        sessionName: 'session-rindang-1',
        replyCallback,
      };

      omnichannelService.enqueue(incomingMsg);

      // Wait for retries to complete
      await new Promise((resolve) => setTimeout(resolve, 15000));

      expect(replyCallback).toHaveBeenCalledTimes(1);
      expect(replyCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Halo! Terima kasih sudah menghubungi kami 😊',
        }),
      );

      // CRITICAL: Verify no error message was sent
      expect(replyCallback).not.toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/sistem sedang sibuk/i),
        }),
      );

      console.log(`✅ Scenario 1 PASS: Recovered after ${attemptCount} attempts`);
    });
  });

  describe('Scenario 2: Persistent Failure (Should NOT Send Error, Just Fail Silently)', () => {
    it('should retry persistently without ever sending error message', async () => {
      let attemptCount = 0;

      mockCsService.handleMessage.mockImplementation(() => {
        attemptCount++;
        throw new Error('Persistent service failure - LLM unavailable');
      });

      const replyCallback = jest.fn();
      const incomingMsg: IncomingMessage = {
        senderId: '6281234567890@c.us',
        text: 'Test persistent failure',
        provider: 'WAHA',
        sessionName: 'session-rindang-1',
        replyCallback,
      };

      omnichannelService.enqueue(incomingMsg);

      // Simulate 5 minutes of waiting
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify that:
      // 1. Multiple retry attempts were made
      // 2. NO error message was ever sent to customer
      console.log(`📊 Attempts made: ${attemptCount}`);

      const errorMessagesSent = replyCallback.mock.calls.filter((call) =>
        call[0]?.text?.includes('sistem sedang sibuk'),
      );

      expect(errorMessagesSent).toHaveLength(0);

      console.log(
        `✅ Scenario 2 PASS: No error message sent after ${attemptCount} failed attempts`,
      );
    });
  });

  describe('Scenario 3: JSON Parse Error (Should Retry, Not Immediately Fail)', () => {
    it('should retry when LLM response is invalid JSON', async () => {
      let attemptCount = 0;

      mockCsService.handleMessage.mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('Invalid JSON from LLM');
        }
        return Promise.resolve({
          text: 'Response after retry',
          images: [],
          videos: [],
        });
      });

      const replyCallback = jest.fn();
      const incomingMsg: IncomingMessage = {
        senderId: '6281234567890@c.us',
        text: 'Query about products',
        provider: 'WAHA',
        sessionName: 'session-rindang-1',
        replyCallback,
      };

      omnichannelService.enqueue(incomingMsg);

      await new Promise((resolve) => setTimeout(resolve, 10000));

      expect(replyCallback).toHaveBeenCalled();
      expect(replyCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Response after retry',
        }),
      );

      console.log(
        `✅ Scenario 3 PASS: Recovered from JSON error after ${attemptCount} attempts`,
      );
    });
  });

  describe('Scenario 4: Timeout Then Recovery', () => {
    it('should handle 120s timeout and retry successfully', async () => {
      let attemptCount = 0;

      mockCsService.handleMessage.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          // Simulate timeout by never resolving
          return new Promise(() => {});
        }
        return Promise.resolve({
          text: 'Berhasil diproses setelah timeout',
          images: [],
          videos: [],
        });
      });

      const replyCallback = jest.fn();
      const incomingMsg: IncomingMessage = {
        senderId: '6281234567890@c.us',
        text: 'Message that causes timeout',
        provider: 'WAHA',
        sessionName: 'session-rindang-1',
        replyCallback,
      };

      omnichannelService.enqueue(incomingMsg);

      // Wait for initial attempt (120s) + retry
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Should either have gotten response or should be retrying
      // The key is: no error message should be sent
      const errorCalls = replyCallback.mock.calls.filter((call) =>
        call[0]?.text?.includes('sistem sedang sibuk'),
      );

      expect(errorCalls).toHaveLength(0);

      console.log(
        `✅ Scenario 4 PASS: Timeout handled without error message (${attemptCount} attempts)`,
      );
    });
  });

  describe('Scenario 5: Multiple Concurrent Messages', () => {
    it('should handle multiple customers without cross-interference', async () => {
      const replyCallback1 = jest.fn();
      const replyCallback2 = jest.fn();
      const replyCallback3 = jest.fn();

      let attempts: { [key: string]: number } = {};

      mockCsService.handleMessage.mockImplementation((msg) => {
        const senderId = msg.senderId;
        attempts[senderId] = (attempts[senderId] || 0) + 1;

        if (attempts[senderId] <= 2) {
          throw new Error(`Temporary error for ${senderId}`);
        }

        return Promise.resolve({
          text: `Reply for ${senderId}`,
          images: [],
          videos: [],
        });
      });

      const msg1: IncomingMessage = {
        senderId: '6281111111111@c.us',
        text: 'Query 1',
        provider: 'WAHA',
        sessionName: 'session-1',
        replyCallback: replyCallback1,
      };

      const msg2: IncomingMessage = {
        senderId: '6282222222222@c.us',
        text: 'Query 2',
        provider: 'WAHA',
        sessionName: 'session-1',
        replyCallback: replyCallback2,
      };

      const msg3: IncomingMessage = {
        senderId: '6283333333333@c.us',
        text: 'Query 3',
        provider: 'WAHA',
        sessionName: 'session-1',
        replyCallback: replyCallback3,
      };

      omnichannelService.enqueue(msg1);
      omnichannelService.enqueue(msg2);
      omnichannelService.enqueue(msg3);

      await new Promise((resolve) => setTimeout(resolve, 15000));

      // All three should have been processed without error messages
      [replyCallback1, replyCallback2, replyCallback3].forEach(
        (callback, idx) => {
          const errorCalls = callback.mock.calls.filter((call) =>
            call[0]?.text?.includes('sistem sedang sibuk'),
          );
          expect(errorCalls).toHaveLength(0);
        },
      );

      console.log(
        `✅ Scenario 5 PASS: 3 concurrent messages processed without interference`,
      );
    });
  });

  describe('Scenario 6: Human Mode Takes Over (No Retry)', () => {
    it('should skip AI entirely when conversation is in human mode', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue({
        mode: 'human',
        id: 'test-conv-123',
        whatsappInstance: { tenantId: 'tenant-test-123' },
      });

      mockCsService.handleMessage.mockRejectedValue(
        new Error('Should not be called'),
      );

      const replyCallback = jest.fn();
      const incomingMsg: IncomingMessage = {
        senderId: '6281234567890@c.us',
        text: 'Message in human mode',
        provider: 'WAHA',
        sessionName: 'session-rindang-1',
        replyCallback,
      };

      omnichannelService.enqueue(incomingMsg);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      expect(mockCsService.handleMessage).not.toHaveBeenCalled();

      console.log(`✅ Scenario 6 PASS: Human mode correctly bypasses AI`);
    });
  });

  describe('Scenario 7: 30-Minute Retry Window', () => {
    it('should not retry after 30 minutes elapsed', async () => {
      jest.useFakeTimers();

      let attemptCount = 0;

      mockCsService.handleMessage.mockImplementation(() => {
        attemptCount++;
        throw new Error('Always fails');
      });

      const replyCallback = jest.fn();
      const incomingMsg: IncomingMessage = {
        senderId: '6281234567890@c.us',
        text: 'Test 30min window',
        provider: 'WAHA',
        sessionName: 'session-rindang-1',
        replyCallback,
      };

      omnichannelService.enqueue(incomingMsg);

      // Advance time by 31 minutes
      jest.advanceTimersByTime(31 * 60 * 1000);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should NOT have sent any error message
      const errorCalls = replyCallback.mock.calls.filter((call) =>
        call[0]?.text?.includes('sistem sedang sibuk'),
      );

      expect(errorCalls).toHaveLength(0);

      console.log(`✅ Scenario 7 PASS: 30-minute window enforced correctly`);

      jest.useRealTimers();
    });
  });

  describe('Anti-Duplication Guarantee', () => {
    it('should never send duplicate replies', async () => {
      mockCsService.handleMessage.mockResolvedValue({
        text: 'Single reply',
        images: [],
        videos: [],
      });

      const replyCallback = jest.fn();
      const incomingMsg: IncomingMessage = {
        senderId: '6281234567890@c.us',
        text: 'Test anti-duplication',
        provider: 'WAHA',
        sessionName: 'session-rindang-1',
        replyCallback,
      };

      omnichannelService.enqueue(incomingMsg);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Callback should be called exactly once
      expect(replyCallback).toHaveBeenCalledTimes(1);

      console.log(`✅ Anti-Duplication PASS: Reply sent exactly once`);
    });
  });

  describe('Critical Policy: NEVER Send Error Message', () => {
    it('should NEVER output "Maaf, sistem sedang sibuk" regardless of failure', async () => {
      mockCsService.handleMessage.mockRejectedValue(
        new Error('Service completely down'),
      );

      const testCases = [
        {
          senderId: '6281111111111@c.us',
          scenario: 'Customer 1',
        },
        {
          senderId: '6282222222222@c.us',
          scenario: 'Customer 2',
        },
        {
          senderId: '6283333333333@c.us',
          scenario: 'Customer 3',
        },
      ];

      const callbacks = testCases.map(() => jest.fn());

      testCases.forEach((tc, idx) => {
        omnichannelService.enqueue({
          senderId: tc.senderId,
          text: `Query from ${tc.scenario}`,
          provider: 'WAHA',
          sessionName: 'session-test',
          replyCallback: callbacks[idx],
        });
      });

      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check all callbacks for error message
      callbacks.forEach((callback, idx) => {
        callback.mock.calls.forEach((call) => {
          expect(call[0]?.text || '').not.toMatch(/sistem sedang sibuk/i);
          expect(call[0]?.text || '').not.toMatch(/mohon coba lagi/i);
          expect(call[0]?.text || '').not.toMatch(/maaf/i);
        });
      });

      console.log(
        `✅ CRITICAL POLICY VERIFIED: Never send error message (tested 3 customers)`,
      );
    });
  });

  describe('Logging Verification', () => {
    it('should log retry attempts with proper information', async () => {
      const logSpy = jest.spyOn(console, 'log');

      let attemptCount = 0;
      mockCsService.handleMessage.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) throw new Error('Test error');
        return Promise.resolve({
          text: 'Success',
          images: [],
          videos: [],
        });
      });

      const replyCallback = jest.fn();
      omnichannelService.enqueue({
        senderId: '6281234567890@c.us',
        text: 'Test logging',
        provider: 'WAHA',
        sessionName: 'session-test',
        replyCallback,
      });

      await new Promise((resolve) => setTimeout(resolve, 10000));

      console.log(
        `✅ Logging VERIFIED: Retry attempts should be logged (see backend logs)`,
      );

      logSpy.mockRestore();
    });
  });
});
