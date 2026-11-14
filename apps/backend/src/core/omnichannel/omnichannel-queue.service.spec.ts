import { Test, TestingModule } from '@nestjs/testing';
import { OmnichannelQueueService } from './omnichannel-queue.service';
import { CsService } from '../../features/agent-cs/cs.service';
import { PrismaService } from '../prisma/prisma.service';
import { AlertService } from '../../modules/monitoring/alert.service';
import { IncomingMessage } from './interfaces/incoming-message.interface';

const DEBOUNCE_MS = 10_000;
const MAX_RETRY_DURATION_MS = 30 * 60 * 1000;

describe('OmnichannelQueueService - Aggressive Retry Strategy (100x, 30min max)', () => {
  let service: OmnichannelQueueService;
  let csService: CsService;

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
  };

  const mockAlertService = {
    alertHardFailMessage: jest.fn(),
  };

  // Advances fake time and flushes microtasks so prisma/LLM promise chains settle
  // between timer ticks (Jest's modern fake timers don't do this automatically).
  async function advance(ms: number) {
    await jest.advanceTimersByTimeAsync(ms);
  }

  function makeMessage(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
    return {
      senderId: '62812345678@c.us',
      text: 'Test message',
      provider: 'WAHA',
      sessionName: 'test-session',
      replyCallback: jest.fn(),
      ...overrides,
    };
  }

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OmnichannelQueueService,
        { provide: CsService, useValue: mockCsService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AlertService, useValue: mockAlertService },
      ],
    }).compile();

    service = module.get<OmnichannelQueueService>(OmnichannelQueueService);
    csService = module.get<CsService>(CsService);

    // Default: conversation in bot mode, no tenant quota concerns.
    mockPrismaService.conversation.findFirst.mockResolvedValue({
      mode: 'bot',
      id: 'conv-123',
      whatsappInstance: { tenantId: 'tenant-123' },
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Basic Message Queuing', () => {
    it('should enqueue message successfully', () => {
      service.enqueue(makeMessage());
      // Buffer is internal; reaching here without throwing is the contract.
      expect(mockCsService.handleMessage).not.toHaveBeenCalled();
    });

    it('should debounce multiple messages from the same customer into one call', async () => {
      const replyCallback = jest.fn();
      mockCsService.handleMessage.mockResolvedValue({
        text: 'Reply',
        images: [],
        videos: [],
      });

      service.enqueue(makeMessage({ text: 'Message 1', replyCallback }));
      await advance(2000);
      service.enqueue(makeMessage({ text: 'Message 2', replyCallback }));

      // Debounce timer resets on the 2nd message, so flush happens 10s after it.
      await advance(DEBOUNCE_MS);

      expect(mockCsService.handleMessage).toHaveBeenCalledTimes(1);
      expect(mockCsService.handleMessage).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Message 1\nMessage 2' }),
      );
      expect(replyCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retry Mechanism (100x, 30min max)', () => {
    it('should retry on failure and succeed once the dependency recovers', async () => {
      let attemptCount = 0;
      mockCsService.handleMessage.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 4) {
          return Promise.reject(new Error('Simulated service error'));
        }
        return Promise.resolve({
          text: 'Success after retries',
          images: [],
          videos: [],
        });
      });

      const replyCallback = jest.fn();
      service.enqueue(makeMessage({ replyCallback }));

      await advance(DEBOUNCE_MS); // flush -> attempt 1 (fails)
      await advance(1_100); // backoff #1 (~1s + jitter) -> attempt 2 (fails)
      await advance(2_100); // backoff #2 (~2s + jitter) -> attempt 3 (fails)
      await advance(4_100); // backoff #3 (~4s + jitter) -> attempt 4 (succeeds)

      expect(attemptCount).toBe(4);
      expect(replyCallback).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Success after retries' }),
      );
    });

    it('should back off exponentially instead of retrying immediately', async () => {
      mockCsService.handleMessage.mockRejectedValue(new Error('Service error'));

      service.enqueue(makeMessage());
      await advance(DEBOUNCE_MS); // attempt 1 fails, schedules backoff #1 (~1s)

      expect(mockCsService.handleMessage).toHaveBeenCalledTimes(1);

      await advance(500); // well under the ~1s backoff
      expect(mockCsService.handleMessage).toHaveBeenCalledTimes(1);

      await advance(600); // crosses the ~1s (+-10% jitter) backoff window
      expect(mockCsService.handleMessage).toHaveBeenCalledTimes(2);
    });

    it('should stop retrying after the 30-minute ceiling and alert instead of replying with an error', async () => {
      mockCsService.handleMessage.mockRejectedValue(
        new Error('Persistent service failure'),
      );

      const replyCallback = jest.fn();
      service.enqueue(makeMessage({ replyCallback }));

      await advance(DEBOUNCE_MS);
      await advance(MAX_RETRY_DURATION_MS + 60_000);

      // Never falls back to an apology message to the customer.
      for (const call of replyCallback.mock.calls) {
        expect(call[0]?.text).not.toMatch(/sistem sedang sibuk/i);
      }

      expect(mockAlertService.alertHardFailMessage).toHaveBeenCalledTimes(1);
      expect(mockAlertService.alertHardFailMessage).toHaveBeenCalledWith(
        '62812345678@c.us',
        'test-session',
        expect.any(Number),
        expect.any(Number),
      );
    });
  });

  describe('Human Mode Bypass', () => {
    it('should skip AI and never call handleMessage when conversation is in human mode', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue({
        mode: 'human',
        id: 'conv-123',
        whatsappInstance: { tenantId: 'tenant-123' },
      });

      service.enqueue(makeMessage());
      await advance(DEBOUNCE_MS);

      expect(csService.handleMessage).not.toHaveBeenCalled();
    });
  });

  describe('Anti-Duplication', () => {
    it('should only send one reply, never duplicate it', async () => {
      mockCsService.handleMessage.mockResolvedValue({
        text: 'Reply message',
        images: [],
        videos: [],
      });

      const replyCallback = jest.fn();
      service.enqueue(makeMessage({ replyCallback }));
      await advance(DEBOUNCE_MS);

      expect(replyCallback).toHaveBeenCalledTimes(1);
      expect(replyCallback).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Reply message' }),
      );
    });
  });

  describe('Error Message Policy', () => {
    it('CRITICAL: should never send "Maaf, sistem sedang sibuk" while retries are in flight', async () => {
      mockCsService.handleMessage.mockRejectedValue(
        new Error('LLM service timeout'),
      );

      const replyCallback = jest.fn();
      service.enqueue(makeMessage({ replyCallback }));

      await advance(DEBOUNCE_MS);
      await advance(1_100);
      await advance(2_100);
      await advance(4_100);

      expect(mockCsService.handleMessage.mock.calls.length).toBeGreaterThan(1);
      for (const call of replyCallback.mock.calls) {
        expect(call[0]?.text).not.toMatch(/sistem sedang sibuk/i);
        expect(call[0]?.text).not.toMatch(/mohon coba lagi/i);
      }
    });
  });

  describe('Timeout Handling', () => {
    it('should allow a response up to 120s per attempt (not fail at 60s)', async () => {
      mockCsService.handleMessage.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ text: 'Delayed response', images: [], videos: [] }),
              70_000, // Between 60s and 120s: only valid if the per-attempt timeout is 120s.
            ),
          ),
      );

      const replyCallback = jest.fn();
      service.enqueue(makeMessage({ replyCallback }));

      await advance(DEBOUNCE_MS);
      await advance(70_000);

      expect(replyCallback).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Delayed response' }),
      );
    });
  });

  describe('Memory Cleanup', () => {
    it('should remove taskStartTimes tracking after a successful response', async () => {
      mockCsService.handleMessage.mockResolvedValue({
        text: 'Success',
        images: [],
        videos: [],
      });

      service.enqueue(makeMessage());
      await advance(DEBOUNCE_MS);

      const taskStartTimes = (service as any).taskStartTimes as Map<string, number>;
      expect(taskStartTimes.size).toBe(0);
    });

    it('should keep taskStartTimes tracking while a retry is pending', async () => {
      mockCsService.handleMessage.mockRejectedValue(new Error('Service error'));

      service.enqueue(makeMessage());
      await advance(DEBOUNCE_MS);

      const taskStartTimes = (service as any).taskStartTimes as Map<string, number>;
      expect(taskStartTimes.size).toBe(1);
    });
  });
});
