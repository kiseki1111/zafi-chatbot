import { Test, TestingModule } from '@nestjs/testing';
import { OmnichannelQueueService } from './omnichannel-queue.service';
import { PrismaService } from '../prisma/prisma.service';
import { CsService } from '../../features/agent-cs/cs.service';
import { IncomingMessage } from './interfaces/incoming-message.interface';

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

    // Langsung flush tanpa menunggu debounce timer 10s
    (service as any).flushCustomerBuffer = function (customerKey: string, botKey: string) {
      if (!this.botQueues.has(botKey)) {
        this.botQueues.set(botKey, []);
      }
      this.botQueues.get(botKey)!.push(incoming);
      this.processBotQueue(botKey);
    };

    (service as any).flushCustomerBuffer('customer_key', 'zafi-property');

    // Beri waktu microtask async pertama selesai (attempt 1 gagal)
    await new Promise((r) => setTimeout(r, 50));
    expect(attempts).toBe(1);

    // Tunggu retry timeout 5000ms dieksekusi (attempt 2 sukses)
    // Untuk test ini kita tunggu atau percepat timeout
    await new Promise((r) => setTimeout(r, 5200));

    expect(attempts).toBe(2);
    expect(replyCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Balasan sukses setelah pulih',
      }),
    );
  }, 10000);
});
