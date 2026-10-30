import { INestApplication } from '@nestjs/common';
import { createTestApp, TestAppContext } from './helpers/create-test-app';
import { OmnichannelQueueService } from '../src/core/omnichannel/omnichannel-queue.service';
import { CsService } from '../src/features/agent-cs/cs.service';
import { OmnichannelModule } from '../src/core/omnichannel/omnichannel.module';

describe('Tier Phase 3: Auto-Toggle Human Takeover saat Limit Kuota', () => {
  let context: TestAppContext;
  let app: INestApplication;
  let queueService: OmnichannelQueueService;

  const mockCsService = {
    handleMessage: jest.fn().mockResolvedValue({
      text: 'Halo! Jawaban dari bot AI',
      images: [],
    }),
  };

  beforeAll(async () => {
    context = await createTestApp({ imports: [OmnichannelModule] }, (b) =>
      b.overrideProvider(CsService).useValue(mockCsService),
    );
    app = context.app;
    queueService = context.module.get<OmnichannelQueueService>(
      OmnichannelQueueService,
    );
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('Harus otomatis mengubah mode percakapan menjadi human dan skip balasan AI saat kuota respons AI tenant habis', async () => {
    // 1. Mock percakapan masih dalam mode bot
    context.mockPrisma.conversation.findFirst.mockResolvedValue({
      id: 'conv-limit-ai',
      mode: 'bot',
      whatsappInstance: { tenantId: 't-lite' },
    });

    // 2. Mock tenant Lite (maxAiResponses: 1000)
    context.mockPrisma.tenant.findUnique.mockResolvedValue({
      id: 't-lite',
      metadata: { plan: 'lite' },
      whatsappInstances: [{ instanceName: 'inst-1' }],
    });

    // 3. Mock pemakaian AI sudah mencapai/melebihi kuota 1000 pesan
    context.mockPrisma.message.count.mockResolvedValue(1000);

    const replyCallback = jest.fn();

    await queueService.enqueue({
      provider: 'waha',
      senderId: '628111222333@c.us',
      sessionName: 'inst-1',
      text: 'Halo, saya mau beli unit rumah',
      replyCallback,
    });

    // Jalankan debounce timer
    await jest.runAllTimersAsync();

    // 4. Pastikan conversation di-update menjadi mode 'human' (admin takeover)
    expect(context.mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv-limit-ai' },
        data: { mode: 'human' },
      }),
    );

    // 5. Pastikan CS Service bot tidak dipanggil dan bot tidak membalas
    expect(mockCsService.handleMessage).not.toHaveBeenCalled();
    expect(replyCallback).not.toHaveBeenCalled();
  });

  it('Harus otomatis mengubah mode percakapan menjadi human saat kuota MAU tenant melampaui 110%', async () => {
    context.mockPrisma.conversation.findFirst.mockResolvedValue({
      id: 'conv-limit-mau',
      mode: 'bot',
      whatsappInstance: { tenantId: 't-lite' },
    });

    context.mockPrisma.tenant.findUnique.mockResolvedValue({
      id: 't-lite',
      metadata: { plan: 'lite' }, // maxMau: 300, 110% = 330
      whatsappInstances: [{ instanceName: 'inst-1' }],
    });

    context.mockPrisma.message.count.mockResolvedValue(100); // AI masih sisa

    // 340 kontak unik (> 330 / 110%)
    context.mockPrisma.conversation.findMany.mockResolvedValue(
      Array.from({ length: 340 }, (_, i) => ({ contactId: `c-${i}` })),
    );

    const replyCallback = jest.fn();

    await queueService.enqueue({
      provider: 'waha',
      senderId: '628999888777@c.us',
      sessionName: 'inst-1',
      text: 'Halo, masih ada rumah?',
      replyCallback,
    });

    await jest.runAllTimersAsync();

    // Percakapan dialihkan ke human takeover
    expect(context.mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv-limit-mau' },
        data: { mode: 'human' },
      }),
    );
    expect(mockCsService.handleMessage).not.toHaveBeenCalled();
    expect(replyCallback).not.toHaveBeenCalled();
  });

  it('Bot AI tetap membalas normal jika kuota masih tersedia atau di Developer Mode', async () => {
    context.mockPrisma.conversation.findFirst.mockResolvedValue({
      id: 'conv-normal',
      mode: 'bot',
      whatsappInstance: { tenantId: 't-dev' },
    });

    context.mockPrisma.tenant.findUnique.mockResolvedValue({
      id: 't-dev',
      metadata: { plan: 'developer' }, // unlimited
      whatsappInstances: [{ instanceName: 'inst-dev' }],
    });

    mockCsService.handleMessage.mockResolvedValue({
      text: 'Halo! Rumah tipe 36 masih tersedia.',
      images: [],
    });

    const replyCallback = jest.fn();

    await queueService.enqueue({
      provider: 'waha',
      senderId: '628555666777@c.us',
      sessionName: 'inst-dev',
      text: 'Tipe 36 ready?',
      replyCallback,
    });

    await jest.runAllTimersAsync();

    // Tidak boleh di-update ke human
    expect(context.mockPrisma.conversation.update).not.toHaveBeenCalled();
    // Bot membalas normal
    expect(mockCsService.handleMessage).toHaveBeenCalled();
    expect(replyCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Halo! Rumah tipe 36 masih tersedia.',
      }),
    );
  });
});
