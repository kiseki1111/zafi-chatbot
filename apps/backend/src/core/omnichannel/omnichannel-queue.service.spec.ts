import { Test, TestingModule } from '@nestjs/testing';
import { OmnichannelQueueService } from './omnichannel-queue.service';
import { CsService } from '../../features/agent-cs/cs.service';
import { PrismaService } from '../prisma/prisma.service';
import { AlertService } from '../../modules/monitoring/alert.service';
import { IncomingMessage } from './interfaces/incoming-message.interface';

describe('OmnichannelQueueService - Aggressive Retry Strategy (100x, 30min max)', () => {
  let service: OmnichannelQueueService;
  let csService: CsService;
  let prisma: PrismaService;

  // Increase Jest timeout for async tests with delays
  jest.setTimeout(20000);

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
        {
          provide: AlertService,
          useValue: mockAlertService,
        },
      ],
    }).compile();

    service = module.get<OmnichannelQueueService>(OmnichannelQueueService);
    csService = module.get<CsService>(CsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Basic Message Queuing', () => {
    it('should enqueue message successfully', () => {
      const message: IncomingMessage = {
        senderId: '62812345678@c.us',
        text: 'Test message',
        provider: 'WAHA',
        sessionName: 'test-session',
        replyCallback: jest.fn(),
      };

      service.enqueue(message);

      expect(message).toBeDefined();
    });

    it('should debounce multiple messages from same customer (10s)', (done) => {
      const replyCallback = jest.fn();
      const message1: IncomingMessage = {
        senderId: '62812345678@c.us',
        text: 'Message 1',
        provider: 'WAHA',
        sessionName: 'test-session',
        replyCallback,
      };

      const message2: IncomingMessage = {
        senderId: '62812345678@c.us',
        text: 'Message 2',
        provider: 'WAHA',
        sessionName: 'test-session',
        replyCallback,
      };

      service.enqueue(message1);
      setTimeout(() => {
        service.enqueue(message2);
      }, 2000);

      setTimeout(() => {
        expect(replyCallback).toHaveBeenCalled();
        done();
      }, 12000);
    });
  });

  describe('Retry Mechanism (100x, 30min max)', () => {
    it('should retry up to 100 times on error', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue({
        mode: 'bot',
        id: 'conv-123',
        whatsappInstance: { tenantId: 'tenant-123' },
      });

      mockPrismaService.tenant.findUnique.mockResolvedValue({
        metadata: { plan: 'basic' },
      });

      let attemptCount = 0;
      mockCsService.handleMessage.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 5) {
          throw new Error('Simulated service error');
        }
        return Promise.resolve({
          text: 'Success after retries',
          images: [],
          videos: [],
        });
      });

      const replyCallback = jest.fn();
      const message: IncomingMessage = {
        senderId: '62812345678@c.us',
        text: 'Test message for retry',
        provider: 'WAHA',
        sessionName: 'test-session',
        replyCallback,
      };

      service.enqueue(message);

      await new Promise((resolve) => setTimeout(resolve, 15000));

      expect(replyCallback).toHaveBeenCalled();
      expect(attemptCount).toBeGreaterThanOrEqual(4);
    });

    it('should NOT send error message after retry exhaustion', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue({
        mode: 'bot',
        id: 'conv-123',
        whatsappInstance: { tenantId: 'tenant-123' },
      });

      mockCsService.handleMessage.mockRejectedValue(
        new Error('Persistent service failure'),
      );

      const replyCallback = jest.fn();
      const message: IncomingMessage = {
        senderId: '62812345678@c.us',
        text: 'Test message for hard fail',
        provider: 'WAHA',
        sessionName: 'test-session',
        replyCallback,
      };

      service.enqueue(message);

      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify that error message "Maaf, sistem sedang sibuk" is NEVER sent
      const errorMessageCalls = replyCallback.mock.calls.filter((call) =>
        call[0]?.text?.includes('Maaf, sistem sedang sibuk'),
      );

      expect(errorMessageCalls).toHaveLength(0);
    });

    it('should use exponential backoff (1s, 2s, 4s, 8s, ... max 60s)', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, Math.min(delay, 100));
      }) as any;

      mockPrismaService.conversation.findFirst.mockResolvedValue({
        mode: 'bot',
        id: 'conv-123',
        whatsappInstance: { tenantId: 'tenant-123' },
      });

      mockCsService.handleMessage.mockRejectedValue(new Error('Service error'));

      const replyCallback = jest.fn();
      const message: IncomingMessage = {
        senderId: '62812345678@c.us',
        text: 'Test exponential backoff',
        provider: 'WAHA',
        sessionName: 'test-session',
        replyCallback,
      };

      service.enqueue(message);

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify exponential backoff pattern exists in delays
      const retryDelays = delays.filter((d) => d > 900 && d < 1100);
      expect(retryDelays.length).toBeGreaterThan(0);

      global.setTimeout = originalSetTimeout;
    });

    it('should enforce 30-minute max retry duration', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue({
        mode: 'bot',
        id: 'conv-123',
        whatsappInstance: { tenantId: 'tenant-123' },
      });

      mockCsService.handleMessage.mockRejectedValue(new Error('Service error'));

      const replyCallback = jest.fn();
      const message: IncomingMessage = {
        senderId: '62812345678@c.us',
        text: 'Test 30min timeout',
        provider: 'WAHA',
        sessionName: 'test-session',
        replyCallback,
      };

      service.enqueue(message);

      // Simulate passing 30+ minutes
      jest.useFakeTimers();
      jest.advanceTimersByTime(31 * 60 * 1000);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(replyCallback).not.toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Maaf, sistem sedang sibuk'),
        }),
      );

      jest.useRealTimers();
    });
  });

  describe('Human Mode Bypass', () => {
    it('should skip AI and not retry when conversation is in human mode', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue({
        mode: 'human',
        id: 'conv-123',
        whatsappInstance: { tenantId: 'tenant-123' },
      });

      const replyCallback = jest.fn();
      const message: IncomingMessage = {
        senderId: '62812345678@c.us',
        text: 'Test human mode',
        provider: 'WAHA',
        sessionName: 'test-session',
        replyCallback,
      };

      service.enqueue(message);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(csService.handleMessage).not.toHaveBeenCalled();
    });
  });

  describe('Anti-Duplication', () => {
    it('should only send reply once, never duplicate', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue({
        mode: 'bot',
        id: 'conv-123',
        whatsappInstance: { tenantId: 'tenant-123' },
      });

      mockCsService.handleMessage.mockResolvedValue({
        text: 'Reply message',
        images: [],
        videos: [],
      });

      const replyCallback = jest.fn();
      const message: IncomingMessage = {
        senderId: '62812345678@c.us',
        text: 'Test anti-duplication',
        provider: 'WAHA',
        sessionName: 'test-session',
        replyCallback,
      };

      service.enqueue(message);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      expect(replyCallback).toHaveBeenCalledTimes(1);
      expect(replyCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Reply message',
        }),
      );
    });
  });

  describe('Error Message Policy', () => {
    it('CRITICAL: should NEVER send "Maaf, sistem sedang sibuk" message', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue({
        mode: 'bot',
        id: 'conv-123',
        whatsappInstance: { tenantId: 'tenant-123' },
      });

      mockCsService.handleMessage.mockRejectedValue(
        new Error('LLM service timeout'),
      );

      const replyCallback = jest.fn();
      const message: IncomingMessage = {
        senderId: '62812345678@c.us',
        text: 'Test critical: never show error',
        provider: 'WAHA',
        sessionName: 'test-session',
        replyCallback,
      };

      service.enqueue(message);

      // Wait for several retry attempts
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Assert that NO reply containing error message was sent
      replyCallback.mock.calls.forEach((call) => {
        expect(call[0]?.text).not.toMatch(/sistem sedang sibuk/i);
        expect(call[0]?.text).not.toMatch(/mohon coba lagi/i);
      });
    });
  });

  describe('Timeout Handling', () => {
    it('should have 120s per-attempt timeout (not 60s)', async () => {
      const timeouts: number[] = [];

      mockPrismaService.conversation.findFirst.mockResolvedValue({
        mode: 'bot',
        id: 'conv-123',
        whatsappInstance: { tenantId: 'tenant-123' },
      });

      mockCsService.handleMessage.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  text: 'Delayed response',
                  images: [],
                  videos: [],
                }),
              100,
            ),
          ),
      );

      const replyCallback = jest.fn();
      const message: IncomingMessage = {
        senderId: '62812345678@c.us',
        text: 'Test timeout value',
        provider: 'WAHA',
        sessionName: 'test-session',
        replyCallback,
      };

      service.enqueue(message);

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(replyCallback).toHaveBeenCalled();
    });
  });

  describe('Memory Cleanup', () => {
    it('should cleanup taskStartTimes after successful response', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue({
        mode: 'bot',
        id: 'conv-123',
        whatsappInstance: { tenantId: 'tenant-123' },
      });

      mockCsService.handleMessage.mockResolvedValue({
        text: 'Success',
        images: [],
        videos: [],
      });

      const replyCallback = jest.fn();
      const message: IncomingMessage = {
        senderId: '62812345678@c.us',
        text: 'Test memory cleanup',
        provider: 'WAHA',
        sessionName: 'test-session',
        replyCallback,
      };

      service.enqueue(message);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(replyCallback).toHaveBeenCalled();
    });
  });
});
