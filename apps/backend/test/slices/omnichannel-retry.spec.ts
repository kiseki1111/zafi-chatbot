import { Test, TestingModule } from '@nestjs/testing';
import { OmnichannelQueueService } from '../../src/core/omnichannel/omnichannel-queue.service';
import { PrismaService } from '../../src/core/prisma/prisma.service';
import { CsService } from '../../src/features/agent-cs/cs.service';
import { IncomingMessage } from '../../src/core/omnichannel/interfaces/incoming-message.interface';

describe('OmnichannelQueueService - Error Resilience & Auto-Retry', () => {
  let service: OmnichannelQueueService;
  let csService: CsService;

  const mockPrisma = {
    conversation: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'conv-123',
        mode: 'bot',
        whatsappInstance: { tenantId: 'tenant-1' },
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    tenant: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'tenant-1',
        metadata: { plan: 'silver', maxAiResponses: 10000 },
      }),
    },
    message: {
      count: jest.fn().mockResolvedValue(10),
    },
  };

  const mockCsService = {
    handleMessage: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OmnichannelQueueService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CsService, useValue: mockCsService },
      ],
    }).compile();

    service = module.get<OmnichannelQueueService>(OmnichannelQueueService);
    csService = module.get<CsService>(CsService);
  });

  it('harus melakukan retry jika CS handling atau replyCallback mengalami kegagalan tak terduga', async () => {
    jest.useFakeTimers();

    let attempts = 0;
    mockCsService.handleMessage.mockImplementation(async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error('Simulasi WAHA atau LLM down');
      }
      return { text: 'Balasan sukses setelah pulih', images: [] };
    });

    const replyCallback = jest.fn().mockResolvedValue(undefined);

    const incoming: IncomingMessage = {
      senderId: '6281649433281@c.us',
      text: 'anda punya drone view nya?',
      provider: 'WAHA',
      sessionName: 'zafi-property',
      replyCallback,
    };

    service.enqueue(incoming);

    // Fast-forward 10s debounce buffer
    jest.advanceTimersByTime(10000);
    // Allow async microtasks to execute
    await Promise.resolve();

    expect(attempts).toBe(1);

    // Fast-forward 5s self-healing retry
    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    expect(attempts).toBe(2);
    expect(replyCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Balasan sukses setelah pulih',
      }),
    );

    jest.useRealTimers();
  });
});
