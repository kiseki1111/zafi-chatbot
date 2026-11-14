import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WahaController } from './waha.controller';
import { WahaService } from './waha.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OmnichannelQueueService } from '../../core/omnichannel/omnichannel-queue.service';

describe('WahaController - Unit Tests (Feature 6 Call Reject & Webhooks)', () => {
  let controller: WahaController;

  const mockWahaService = {
    getInstances: jest.fn(),
    createInstance: jest.fn(),
    startSession: jest.fn(),
    stopSession: jest.fn(),
    getQrCode: jest.fn(),
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
    sendSeen: jest.fn().mockResolvedValue(undefined),
    sendTypingPresence: jest.fn().mockResolvedValue(undefined),
    rejectCall: jest.fn().mockResolvedValue({ status: 'rejected' }),
    downloadAndStoreMedia: jest
      .fn()
      .mockResolvedValue('/uploads/incoming/voice.ogg'),
  };

  const mockPrismaService = {
    whatsappInstance: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      upsert: jest.fn().mockResolvedValue({}),
    },
    contact: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'contact-01', phone: '628999888777' }),
      create: jest.fn().mockResolvedValue({ id: 'contact-01' }),
      update: jest.fn().mockResolvedValue({ id: 'contact-01' }),
    },
    conversation: {
      findFirst: jest.fn(),
      upsert: jest.fn().mockResolvedValue({ id: 'conv-123' }),
    },
    message: {
      create: jest.fn().mockResolvedValue({ id: 'msg-call' }),
      upsert: jest.fn().mockResolvedValue({ id: 'msg-upsert' }),
      updateMany: jest.fn(),
    },
    webhookLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  };

  const mockOmnichannelQueue = {
    addMessage: jest.fn(),
    enqueue: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Controller only processes sessions registered in DB; default to "known"
    // so webhook tests reach their actual assertions instead of the
    // ignored_unknown_session early-return.
    mockPrismaService.whatsappInstance.findUnique.mockResolvedValue({
      instanceName: 'zafi-cs',
      tenantId: 'tenant-1',
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WahaController],
      providers: [
        { provide: WahaService, useValue: mockWahaService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OmnichannelQueueService, useValue: mockOmnichannelQueue },
      ],
    }).compile();

    controller = module.get<WahaController>(WahaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Feature 6: Event call.received webhook', () => {
    it('harus memanggil rejectCall dan menyimpan notifikasi panggilan masuk ke database', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValueOnce({
        id: 'contact-01',
        phone: '628999888777',
      });

      const payload = {
        session: 'zafi-cs',
        event: 'call.received',
        payload: {
          id: 'call-unique-123',
          from: '628999888777@c.us',
          caller: '628999888777@c.us',
        },
      };

      await controller.handleWebhook(payload);

      // 1. Verifikasi WAHA rejectCall terpanggil
      expect(mockWahaService.rejectCall).toHaveBeenCalledWith(
        'zafi-cs',
        'call-unique-123',
      );

      // 2. Verifikasi pesan sistem dicatat di percakapan
      expect(mockPrismaService.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conversationId: 'conv-123',
            senderType: 'system',
            messageType: 'CALL',
            content: expect.stringContaining(
              'Panggilan WhatsApp masuk (Otomatis ditolak)',
            ),
          }),
        }),
      );

      // 3. Verifikasi bot membalas ramah ke penelpon
      expect(mockWahaService.sendMessage).toHaveBeenCalledWith(
        'zafi-cs',
        '628999888777@c.us',
        expect.stringContaining('tidak dapat menerima panggilan'),
      );
    });

    it('harus mengenali input voice note (ptt) dengan messageType audio', async () => {
      mockPrismaService.contact.findFirst.mockResolvedValueOnce({
        id: 'contact-02',
        phone: '628111222333',
      });

      const payload = {
        session: 'zafi-cs',
        event: 'message',
        payload: {
          id: 'msg-ptt-123',
          from: '628111222333@c.us',
          type: 'ptt',
          hasMedia: true,
          media: {
            url: 'http://waha:3000/api/files/voice.ogg',
            mimetype: 'audio/ogg; codecs=opus',
          },
        },
      };

      await controller.handleWebhook(payload);

      expect(mockPrismaService.message.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            messageType: 'audio',
            content: 'Mengirim pesan suara',
          }),
        }),
      );
    });

    it('harus mengabaikan echo message.any (fromMe) dengan LID tak teresolusi, tanpa membuat kontak/percakapan hantu', async () => {
      // Reproduksi bug produksi: bot mengirim balasan, WAHA meng-echo kembali pesan
      // keluar itu sebagai message.any dengan fromMe=true, tapi remoteJid/to masih
      // berupa @lid (gagal diresolusi WAHA ke nomor asli). Sebelum fix, ini membuat
      // kontak baru dengan "nomor" = digit LID, lalu conversation.upsert membuat
      // kontak itu naik ke atas daftar monitoring tanpa ada chat baru yang terlihat.
      mockWahaService.getContact = jest.fn().mockResolvedValue({ id: '34304725926129@lid' });

      const payload = {
        session: 'zafi-cs',
        event: 'message.any',
        payload: {
          id: { _serialized: 'true_6262112710705@lid_3EB038D075231F98532602' },
          fromMe: true,
          from: '34304725926129@lid',
          to: '34304725926129@lid',
          _data: {
            key: { remoteJid: '34304725926129@lid' },
          },
          body: 'Halo kak! Terima kasih sudah nanya soal free trial ZAF SAPA.',
        },
      };

      const result = await controller.handleWebhook(payload);

      expect(result).toEqual({ status: 'ignored_unresolved_lid_echo' });
      expect(mockPrismaService.contact.create).not.toHaveBeenCalled();
      expect(mockPrismaService.contact.update).not.toHaveBeenCalled();
      expect(mockPrismaService.conversation.upsert).not.toHaveBeenCalled();
      expect(mockPrismaService.message.upsert).not.toHaveBeenCalled();
    });

    it('harus tetap memproses echo message.any (fromMe) saat LID berhasil diresolusi ke nomor asli', async () => {
      // Kebalikan dari test di atas: kalau WAHA BERHASIL resolve @lid ke nomor asli,
      // alur normal (simpan/update pesan di percakapan yang benar) harus tetap jalan.
      mockWahaService.getContact = jest
        .fn()
        .mockResolvedValue({ id: '628999888777@c.us' });
      mockPrismaService.conversation.upsert.mockResolvedValueOnce({
        id: 'conv-resolved',
      });

      const payload = {
        session: 'zafi-cs',
        event: 'message.any',
        payload: {
          id: { _serialized: 'true_abc123' },
          fromMe: true,
          from: '34304725926129@lid',
          to: '34304725926129@lid',
          _data: {
            key: { remoteJid: '34304725926129@lid' },
          },
          body: 'Balasan bot berhasil terkirim',
        },
      };

      const result = await controller.handleWebhook(payload);

      expect(result).toEqual({ status: 'success' });
      expect(mockPrismaService.message.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            senderType: 'bot',
            content: 'Balasan bot berhasil terkirim',
          }),
        }),
      );
    });

    it('harus mencatat detail lengkap (engine/browser/versi/jumlah transisi) saat sesi FAILED, bukan cuma reason', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Struktur nyata WAHA: id/engine/environment ada di level atas event,
      // payload.payload adalah detail status itu sendiri (lihat webhook_logs produksi).
      const realPayload = {
        session: 'zaf-tech',
        event: 'session.status',
        id: 'evt_01m7d8r25z0chrmd90emb5tfqj',
        engine: 'WEBJS',
        environment: {
          tier: 'CORE',
          engine: 'WEBJS',
          browser: '/usr/bin/google-chrome',
          version: '2026.9.1',
          platform: 'linux/x64',
        },
        payload: {
          data: null,
          name: 'zaf-tech',
          status: 'FAILED',
          statuses: [
            { status: 'FAILED', timestamp: 1794667971909 },
            { status: 'FAILED', timestamp: 1794667972799 },
            { status: 'FAILED', timestamp: 1794667972799 },
          ],
        },
      };

      await controller.handleWebhook(realPayload);

      const failedLog = warnSpy.mock.calls.find((call) =>
        String(call[0]).includes('Sesi zaf-tech FAILED'),
      );
      expect(failedLog).toBeDefined();
      const logLine = String(failedLog![0]);
      expect(logLine).toContain('engine=WEBJS');
      expect(logLine).toContain('browser=/usr/bin/google-chrome');
      expect(logLine).toContain('waVersion=2026.9.1');
      expect(logLine).toContain('transitions=3');

      warnSpy.mockRestore();
    });

    it('harus dedupe log & notifikasi saat event session.status yang sama terkirim dobel (dua webhook URL)', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      const realPayload = {
        session: 'zaf-tech',
        event: 'session.status',
        id: 'evt_duplicate_test_001',
        engine: 'WEBJS',
        environment: { browser: '/usr/bin/google-chrome', version: '2026.9.1' },
        payload: { status: 'FAILED' },
      };

      // Simulasikan WAHA mengirim event yang sama dua kali (satu per webhook URL terdaftar)
      await controller.handleWebhook(realPayload);
      await controller.handleWebhook({ ...realPayload });

      const failedLogs = warnSpy.mock.calls.filter((call) =>
        String(call[0]).includes('Sesi zaf-tech FAILED'),
      );
      expect(failedLogs).toHaveLength(1);

      warnSpy.mockRestore();
    });

    it('tetap mencatat log untuk sesi berbeda meski event.id sama (dedupe harus per-sesi)', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      mockPrismaService.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'zaf-tech-2',
        tenantId: 'tenant-2',
      });

      const basePayload = {
        event: 'session.status',
        id: 'evt_shared_id',
        payload: { status: 'FAILED' },
      };

      await controller.handleWebhook({ ...basePayload, session: 'zaf-tech' });
      await controller.handleWebhook({ ...basePayload, session: 'zaf-tech-2' });

      const failedLogs = warnSpy.mock.calls.filter(
        (call) =>
          String(call[0]).includes('FAILED') && String(call[0]).includes('Sesi'),
      );
      expect(failedLogs.length).toBeGreaterThanOrEqual(2);

      warnSpy.mockRestore();
    });

    it('harus menolak request dengan ForbiddenException jika webhook secret salah', async () => {
      const payload = { session: 'zafi-cs', event: 'message' };
      // Must be a genuinely external IP — controller trusts internal ranges
      // (127.*, 10.*, 172.*, 192.168.*) and would bypass the secret check.
      const req = { ip: '8.8.8.8', query: {} };

      await expect(
        controller.handleWebhook(payload, 'wrong-secret', req),
      ).rejects.toThrow('Invalid or missing webhook secret');
    });
  });
});
