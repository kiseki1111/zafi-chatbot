import { Test, TestingModule } from '@nestjs/testing';
import { CsService } from './cs.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AgentSharedService } from '../../core/agent-shared/agent-shared.service';

describe('CsService', () => {
  let service: CsService;

  const mockPrisma = {
    whatsappInstance: {
      findUnique: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    contact: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockAgentShared = {
    analyzeImage: jest.fn(),
    transcribeAudio: jest.fn(),
    getRecentContext: jest.fn(),
    retrieveRelevantKnowledge: jest.fn(),
    getAvailabilityContext: jest.fn(),
    callLLM: jest.fn(),
    callLLMStream: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.message.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.create.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AgentSharedService, useValue: mockAgentShared },
      ],
    }).compile();

    service = module.get<CsService>(CsService);
  });

  it('harus terdefinisi', () => {
    expect(service).toBeDefined();
  });

  describe('handleMessage', () => {
    it('harus mengembalikan pesan fallback jika nomor instance belum terhubung ke tenant', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue(null);

      const response = await service.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'unknown-instance',
        text: 'Halo',
        provider: 'WAHA',
        replyCallback: jest.fn(),
      });

      expect(response.text).toContain('belum terhubung');
      expect(response.images).toEqual([]);
    });

    it('harus memproses pesan teks biasa dan mengembalikan respon dari LLM', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([
        { senderType: 'user', content: 'Halo kak' },
      ]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'main-wa',
        tenantId: 'tenant-123',
      });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue(
        'Produk unggulan: Kopi Gayo',
      );
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-123',
        name: 'Kedai Kopi',
        agentName: 'Luna',
        agentTone: 'ramah',
      });

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Halo Kak! Mau coba Kopi Gayo kami hari ini?',
          images: [],
          videos: [],
        }),
      );

      const response = await service.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'main-wa',
        text: 'Halo mau tanya kopi',
      });

      expect(response.text).toBe('Halo Kak! Mau coba Kopi Gayo kami hari ini?');
      expect(mockAgentShared.retrieveRelevantKnowledge).toHaveBeenCalledWith(
        'Halo mau tanya kopi',
        'tenant-123',
      );
    });

    it('harus menyertakan Vision AI jika pesan membawa media URL gambar', async () => {
      mockAgentShared.analyzeImage.mockResolvedValue(
        'Foto bungkus kopi robusta 250gr',
      );
      mockAgentShared.getRecentContext.mockResolvedValue([]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'main-wa',
        tenantId: 'tenant-123',
      });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-123' });

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Itu kopi Robusta 250 gram ya kak, ready stok!',
          images: [],
          videos: [],
        }),
      );

      const response = await service.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'main-wa',
        text: 'Ini jenis apa kak?',
        mediaUrls: ['http://example.com/photo.jpg'],
      });

      expect(mockAgentShared.analyzeImage).toHaveBeenCalledWith(
        'http://example.com/photo.jpg',
      );
      expect(response.text).toContain('Robusta');
    });

    it('harus mentranskripsi pesan suara via transcribeAudio dan merespons isinya', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'main-wa',
        tenantId: 'tenant-123',
      });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-123' });
      mockAgentShared.transcribeAudio.mockResolvedValue(
        'Berapa harga kopi robusta?',
      );

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Harga kopi robusta Rp 50.000 ya Kak.',
          images: [],
          videos: [],
        }),
      );

      const response = await service.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'main-wa',
        text: '',
        audioUrl: '/uploads/incoming/voice.ogg',
        provider: 'WAHA',
        replyCallback: jest.fn(),
      });

      expect(mockAgentShared.transcribeAudio).toHaveBeenCalledWith(
        '/uploads/incoming/voice.ogg',
      );
      expect(response.text).toContain('50.000');
    });

    it('harus menyertakan informasi stok real-time saat pesan menanyakan stok', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'main-wa',
        tenantId: 'tenant-123',
      });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([
        { name: 'Kopi Arabika', stock: 15 },
      ]);
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-123' });

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Kopi Arabika masih ready 15 bungkus ya Kak.',
          images: [],
          videos: [],
        }),
      );

      const response = await service.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'main-wa',
        text: 'apakah kopi arabika masih ready stok?',
      });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-123' },
        take: 30,
      });
      expect(response.text).toContain('ready 15 bungkus');
    });

    it('harus mengekstrak profil lead dan menyimpan kontak dengan nama Anonim jika belum menyebut nama', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-property',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-property' });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);
      mockPrisma.contact.findFirst.mockResolvedValue(null);
      mockPrisma.contact.create.mockResolvedValue({
        id: 'contact-anon-1',
        name: 'Anonim',
        phone: '628123456789',
        status: 'Follow-Up',
      });

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Untuk Griya Amanah 2 Tipe 40 harganya Rp 295.000.000 ya Kak.',
          images: [],
          videos: [],
          lead: {
            customerName: 'Anonim',
            perumahan: 'Griya Amanah 2',
            tipeUnit: 'Tipe 40',
            hargaUnit: 295000000,
            status: 'Follow-Up',
            notes: 'Tanya harga Griya Amanah 2 Tipe 40',
          },
        }),
      );

      const response = await service.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'wa-property',
        text: 'halo min, griya amanah 2 tipe 40 harganya berapa ya?',
      });

      expect(response.lead).toBeDefined();
      expect(response.lead?.customerName).toBe('Anonim');
      expect(response.lead?.perumahan).toBe('Griya Amanah 2');
      expect(mockPrisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Anonim',
            status: 'Follow-Up',
            metadata: expect.objectContaining({
              perumahan: 'Griya Amanah 2',
              tipeUnit: 'Tipe 40',
            }),
          }),
        }),
      );
    });

    it('harus mengupdate nama dari Anonim ke nama asli saat pelanggan memperkenalkan diri di chat', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([
        { senderType: 'customer', content: 'Griya Amanah 2 masih ada?' },
        { senderType: 'bot', content: 'Masih ready Kak.' },
      ]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-property',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-property' });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      // Kontak sebelumnya bernama Anonim
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'contact-anon-1',
        name: 'Anonim',
        phone: '628123456789',
        status: 'Follow-Up',
        metadata: { perumahan: 'Griya Amanah 2' },
        notes: 'Tanya unit',
      });
      mockPrisma.contact.update.mockResolvedValue({
        id: 'contact-anon-1',
        name: 'Hendra Wijaya',
        status: 'Survey',
      });

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Baik Kak Hendra, sampai ketemu hari Sabtu untuk survey lokasi.',
          images: [],
          videos: [],
          lead: {
            customerName: 'Hendra Wijaya',
            perumahan: 'Griya Amanah 2',
            tipeUnit: 'Tipe 40',
            status: 'Survey',
            notes: 'Minta survey hari Sabtu',
          },
        }),
      );

      const response = await service.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'wa-property',
        text: 'kenalin saya Hendra Wijaya, mau survey hari Sabtu ya',
      });

      expect(response.lead?.customerName).toBe('Hendra Wijaya');
      expect(response.lead?.status).toBe('Survey');
      expect(mockPrisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contact-anon-1' },
          data: expect.objectContaining({
            name: 'Hendra Wijaya',
            status: 'Survey',
          }),
        }),
      );
    });

    it('harus menandai Hot Lead dan membuat audit log saat pelanggan minta survey lokasi', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([
        { senderType: 'customer', content: 'saya mau survey lokasi minggu ini' },
      ]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-property',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-property' });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'contact-hot-1',
        name: 'Anonim',
        phone: '628123456789',
        status: 'Follow-Up',
        tenantId: 'tenant-property',
        metadata: { messageCount: 2 },
        notes: null,
      });
      mockPrisma.message.findMany.mockResolvedValue([
        { content: 'saya mau survey lokasi minggu ini' },
        { content: 'halo kak' },
        { content: 'lokasinya dimana' },
        { content: 'jam berapa bisa survey' },
      ]);
      mockPrisma.contact.update.mockResolvedValue({ id: 'contact-hot-1' });

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Siap Kak, kami jadwalkan survey lokasi ya.',
          images: [],
          videos: [],
          lead: {
            customerName: 'Anonim',
            perumahan: 'Griya Amanah 2',
            status: 'Survey',
            notes: 'Minta jadwal survey lokasi',
          },
        }),
      );

      await service.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'wa-property',
        text: 'saya mau survey lokasi minggu ini',
      });

      expect(mockPrisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contact-hot-1' },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              leadScore: 'HOT',
              hotAcknowledged: false,
              messageCount: 4,
            }),
          }),
        }),
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'HOT_LEAD_DETECTED',
            module: 'CRM',
            details: expect.objectContaining({
              contactId: 'contact-hot-1',
              triggerType: 'KEYWORD',
            }),
          }),
        }),
      );
    });

    it('harus tidak membuat notifikasi/audit log ganda jika lead sudah pernah ditandai HOT', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([
        { senderType: 'customer', content: 'oke kak, saya mau survey lokasi' },
      ]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-property',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-property' });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'contact-hot-2',
        name: 'Anonim',
        phone: '628987654321',
        status: 'Survey',
        tenantId: 'tenant-property',
        metadata: {
          messageCount: 5,
          leadScore: 'HOT',
          hotNotified: true,
          hotNotifiedAt: '2026-01-01T00:00:00.000Z',
          hotAcknowledged: false,
        },
        notes: null,
      });
      mockPrisma.message.findMany.mockResolvedValue([
        { content: 'halo kak' },
        { content: 'saya mau survey lokasi' },
        { content: 'minggu ini bisa' },
        { content: 'jam berapa' },
        { content: 'oke siap' },
      ]);
      mockPrisma.contact.update.mockResolvedValue({ id: 'contact-hot-2' });

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Baik Kak, jadwal survey sudah dicatat.',
          images: [],
          videos: [],
          lead: {
            customerName: 'Anonim',
            status: 'Survey',
            notes: 'Konfirmasi survey',
          },
        }),
      );

      await service.handleMessage({
        senderId: '628987654321@c.us',
        sessionName: 'wa-property',
        text: 'oke kak, saya mau survey lokasi',
      });

      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
      expect(mockPrisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              leadScore: 'HOT',
              hotNotified: true,
              hotNotifiedAt: '2026-01-01T00:00:00.000Z',
            }),
          }),
        }),
      );
    });

    it('harus mempertahankan HOT (sticky) saat sinyal turun ke WARM tanpa penolakan eksplisit', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([
        { senderType: 'customer', content: 'oke kak makasih' },
      ]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-property',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-property' });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'contact-sticky',
        name: 'Anonim',
        phone: '628111111111',
        status: 'Follow-Up',
        tenantId: 'tenant-property',
        metadata: {
          leadScore: 'HOT',
          leadScoreCode: 'HOT_SURVEY',
          hotTriggerReason: 'Permintaan Survey Lokasi Fisik',
          hotNotified: true,
          hotNotifiedAt: new Date().toISOString(),
        },
        notes: null,
      });
      mockPrisma.contact.update.mockResolvedValue({ id: 'contact-sticky' });

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Sama-sama Kak.',
          images: [],
          videos: [],
          lead: { customerName: 'Anonim', status: 'Follow-Up' },
        }),
      );

      await service.handleMessage({
        senderId: '628111111111@c.us',
        sessionName: 'wa-property',
        text: 'oke kak makasih',
      });

      expect(mockPrisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              leadScore: 'HOT',
              leadScoreCode: 'HOT_SURVEY',
              hotTriggerReason: 'Permintaan Survey Lokasi Fisik',
            }),
          }),
        }),
      );
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('harus menurunkan HOT ke COLD saat ada penolakan eksplisit dan mereset notifikasi', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([
        { senderType: 'customer', content: 'kemahalan kak' },
      ]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-property',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-property' });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'contact-reject',
        name: 'Anonim',
        phone: '628222222222',
        status: 'Follow-Up',
        tenantId: 'tenant-property',
        metadata: {
          leadScore: 'HOT',
          leadScoreCode: 'HOT_SURVEY',
          hotNotified: true,
          hotNotifiedAt: '2026-01-01T00:00:00.000Z',
        },
        notes: null,
      });
      mockPrisma.contact.update.mockResolvedValue({ id: 'contact-reject' });

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Baik Kak, terima kasih infonya.',
          images: [],
          videos: [],
          lead: { customerName: 'Anonim', status: 'Batal' },
        }),
      );

      await service.handleMessage({
        senderId: '628222222222@c.us',
        sessionName: 'wa-property',
        text: 'kemahalan kak',
      });

      expect(mockPrisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              leadScore: 'COLD',
              leadScoreCode: 'COLD_EXPLICIT_REJECT',
            }),
          }),
        }),
      );
    });

    it('tidak menggandakan pesan terkini jika sudah tersimpan di database', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([
        { senderType: 'customer', content: 'ini pesan keempat saya' },
      ]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-property',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-property' });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'contact-count',
        name: 'Anonim',
        phone: '628444444444',
        status: 'Follow-Up',
        tenantId: 'tenant-property',
        metadata: { messageCount: 3 },
        notes: null,
      });
      mockPrisma.message.findMany.mockResolvedValue([
        { content: 'halo kak' },
        { content: 'saya tanya tanya dulu' },
        { content: 'lokasinya dimana' },
        { content: 'ini pesan keempat saya' },
      ]);
      mockPrisma.contact.update.mockResolvedValue({ id: 'contact-count' });

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Baik Kak.',
          images: [],
          videos: [],
          lead: { customerName: 'Anonim', status: 'Follow-Up' },
        }),
      );

      await service.handleMessage({
        senderId: '628444444444@c.us',
        sessionName: 'wa-property',
        text: 'ini pesan keempat saya',
      });

      expect(mockPrisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              messageCount: 4,
              leadScoreCode: 'WARM_CHAT_VOLUME',
            }),
          }),
        }),
      );
    });

    it('harus membuat audit log dan mereset hotAcknowledged saat transisi ke episode HOT baru', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([
        { senderType: 'customer', content: 'oke saya booking unit A' },
      ]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-property',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-property' });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'contact-rehot',
        name: 'Anonim',
        phone: '628555555555',
        status: 'Follow-Up',
        tenantId: 'tenant-property',
        metadata: {
          leadScore: 'COLD',
          leadScoreCode: 'COLD_EXPLICIT_REJECT',
          hotAcknowledged: true,
          leadOutcome: 'NOT_WORTH',
        },
        notes: null,
      });
      mockPrisma.message.findMany.mockResolvedValue([
        { content: 'oke saya booking unit A' },
      ]);
      mockPrisma.contact.update.mockResolvedValue({ id: 'contact-rehot' });

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Siap Kak, unit A kami tahan.',
          images: [],
          videos: [],
          lead: { customerName: 'Anonim', status: 'Booking' },
        }),
      );

      await service.handleMessage({
        senderId: '628555555555@c.us',
        sessionName: 'wa-property',
        text: 'oke saya booking unit A',
      });

      expect(mockPrisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              leadScore: 'HOT',
              leadScoreCode: 'HOT_BOOKING',
              hotAcknowledged: false,
              leadOutcomeHistory: expect.arrayContaining([
                expect.objectContaining({ outcome: 'NOT_WORTH' }),
              ]),
            }),
          }),
        }),
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('G7 - HOT baru dari HOT lain (HOT_SURVEY -> HOT_KPR) tidak mereset hotAcknowledged jika sudah dilihat', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([
        { senderType: 'customer', content: 'simulasi kpr berapa' },
      ]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-property',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-property' });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'contact-hot-transition',
        name: 'Anonim',
        phone: '628555123456',
        status: 'Survey',
        tenantId: 'tenant-property',
        metadata: {
          leadScore: 'HOT',
          leadScoreCode: 'HOT_SURVEY',
          hotEpisodeStartedAt: '2026-11-12T00:00:00.000Z',
          hotAcknowledged: true, // sudah di-review marketing
        },
        notes: null,
      });
      mockPrisma.message.findMany.mockResolvedValue([
        { content: 'simulasi kpr berapa' },
      ]);
      mockPrisma.contact.update.mockResolvedValue({ id: 'contact-hot-transition' });

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Simulasi KPR cicilan 2 jutaan ya Kak.',
          images: [],
          videos: [],
          lead: { customerName: 'Anonim', status: 'Survey' },
        }),
      );

      await service.handleMessage({
        senderId: '628555123456@c.us',
        sessionName: 'wa-property',
        text: 'simulasi kpr berapa',
      });

      expect(mockPrisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              leadScore: 'HOT',
              leadScoreCode: 'HOT_KPR',
              hotAcknowledged: true, // tetap true, tidak dibolak-balik unread
            }),
          }),
        }),
      );
    });

    it('E5 & E6 - Duplikat & pesan pendek (<3 char) tidak menambah messageCount', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([
        { senderType: 'customer', content: 'halo' },
      ]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-property',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-property' });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'contact-spam',
        name: 'Anonim',
        phone: '628999888777',
        status: 'Follow-Up',
        tenantId: 'tenant-property',
        metadata: {},
        notes: null,
      });
      // spam 'p', 'ok', 'iya' (semua < 3 char)
      mockPrisma.message.findMany.mockResolvedValue([
        { content: 'p' },
        { content: 'ok' },
        { content: 'iya' },
      ]);
      mockPrisma.contact.update.mockResolvedValue({ id: 'contact-spam' });

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Halo kak.',
          images: [],
          videos: [],
          lead: { customerName: 'Anonim', status: 'Follow-Up' },
        }),
      );

      await service.handleMessage({
        senderId: '628999888777@c.us',
        sessionName: 'wa-property',
        text: 'ok', // pesan < 3 karakter
      });

      expect(mockPrisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              messageCount: 1, // hanya 1 pesan customer unik yang valid
              leadScoreCode: 'COLD_INQUIRY',
            }),
          }),
        }),
      );
    });

    it('harus memindahkan tautan media sosial (Instagram Reel) dari videos ke teks balasan jika terdaftar di database', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-property',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-property' });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue(
        'Tersedia video lokasi: https://www.instagram.com/reel/DVkx0HGjnEi/?utm_source=ig_web_copy_link',
      );
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Berikut video yang Kakak minta:',
          images: [],
          videos: [
            {
              url: 'https://www.instagram.com/reel/DVkx0HGjnEi/?utm_source=ig_web_copy_link',
              caption: 'Video Arah Menuju Zafi Residence',
            },
          ],
        }),
      );

      const response = await service.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'wa-property',
        text: 'ada video menuju lokasi zafi residence?',
      });

      // Array videos harus kosong karena ini adalah link IG Reel, bukan file video biner .mp4
      expect(response.videos).toEqual([]);
      // Tautan harus disertakan di dalam teks balasan agar WhatsApp memunculkan rich link preview
      expect(response.text).toContain(
        'https://www.instagram.com/reel/DVkx0HGjnEi/',
      );
      expect(response.text).toContain('Video Arah Menuju Zafi Residence');
    });

    it('harus mempertahankan file video langsung (.mp4 atau /uploads/) di array videos saat diminta user', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-property',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-property' });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue(
        'Video tour unit: /uploads/video-zafi-residence.mp4',
      );
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Ini video unitnya kak.',
          images: [],
          videos: [
            {
              url: '/uploads/video-zafi-residence.mp4',
              caption: 'Video Unit',
            },
          ],
        }),
      );

      const response = await service.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'wa-property',
        text: 'minta video unitnya dong kak',
      });

      expect(response.videos).toHaveLength(1);
      expect(response.videos[0].url).toBe('/uploads/video-zafi-residence.mp4');
    });

    it('harus menolak dan membersihkan link video lama yang ada di riwayat chat jika dokumen sudah dihapus dari knowledge base', async () => {
      // Riwayat percakapan lama masih memuat link video dari sesi sebelum dihapus
      mockAgentShared.getRecentContext.mockResolvedValue([
        {
          senderType: 'bot',
          content:
            'Ini videonya kak https://www.instagram.com/reel/DVkx0HGjnEi/',
        },
      ]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-property',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-property' });
      // Database pengetahuan KOSONG karena sudah dihapus oleh tester
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      // LLM mencoba mengulang link yang ia lihat dari riwayat chat
      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Ini videonya ya kak: https://www.instagram.com/reel/DVkx0HGjnEi/',
          images: [],
          videos: [
            {
              url: 'https://www.instagram.com/reel/DVkx0HGjnEi/',
              caption: 'Video Zafi',
            },
          ],
        }),
      );

      const response = await service.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'wa-property',
        text: 'ada videonya kak?',
      });

      // Video tidak boleh dikirimkan karena tidak ada di database pengetahuan aktif
      expect(response.videos).toEqual([]);
      // Tautan usang di teks balasan juga harus dibersihkan
      expect(response.text).not.toContain(
        'https://www.instagram.com/reel/DVkx0HGjnEi/',
      );

      // Prompt ke LLM harus menetralkan link lama dari chat history
      expect(mockAgentShared.callLLM).toHaveBeenCalledWith(
        expect.stringContaining(
          '[tautan media sebelumnya telah dihapus dari database]',
        ),
        expect.any(String),
        true,
      );
    });

    it('harus menggunakan dynamic safety net jika LLM mengembalikan text kosong saat request foto', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-rindang',
        tenantId: 'tenant-rindang',
        tenant: {
          id: 'tenant-rindang',
          name: 'Rindang Property',
          phone: '08123456789',
        },
      });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      // LLM mengembalikan text kosong dan images kosong
      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: '',
          images: [],
          videos: [],
        }),
      );

      const response = await service.handleMessage({
        senderId: '6285820404344@c.us',
        sessionName: 'wa-rindang',
        text: 'foto lokasi lapangan',
      });

      expect(response.text.length).toBeGreaterThan(0);
      expect(response.text).toContain('Rindang Property');
      expect(response.text).toContain('foto');
      expect(response.text).toContain('08123456789');
    });

    it('harus menangkap teks jika LLM menamai key balasan dengan message atau response', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-rindang',
        tenantId: 'tenant-rindang',
      });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          message: 'Halo Kak, ada yang bisa kami bantu seputar unit kami?',
          images: [],
        }),
      );

      const response = await service.handleMessage({
        senderId: '6285820404344@c.us',
        sessionName: 'wa-rindang',
        text: 'halo',
      });

      expect(response.text).toBe(
        'Halo Kak, ada yang bisa kami bantu seputar unit kami?',
      );
    });
  });

  // Verifikasi bahwa data katalog di DB benar-benar masuk ke system prompt yang
  // diterima LLM — jadi chatbot menjawab berdasarkan fakta katalog, bukan halusinasi.
  describe('akurasi konteks katalog produk di system prompt', () => {
    const setup = (products: any[]) => {
      mockAgentShared.getRecentContext.mockResolvedValue([]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'main-wa',
        tenantId: 'tenant-123',
      });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-123',
        name: 'Kedai Kopi Nusantara',
        agentName: 'Luna',
        agentTone: 'ramah',
      });
      mockPrisma.product.findMany.mockResolvedValue(products);
      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({ text: 'Siap Kak.', images: [], videos: [] }),
      );
    };

    // systemPrompt adalah argumen ke-2 callLLM(prompt, systemPrompt, requireJson)
    const getSystemPrompt = () =>
      String(mockAgentShared.callLLM.mock.calls[0]?.[1] || '');

    const ask = () =>
      service.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'main-wa',
        text: 'Produknya harganya berapa dan stoknya masih ada?',
      });

    it('menyertakan nama, kategori, harga (Decimal) terformat & stok akurat', async () => {
      setup([
        {
          name: 'Kopi Arabika Gayo 250gr',
          category: 'Makanan & Minuman',
          price: '85000.00', // Prisma Decimal diserialisasi sebagai string
          stock: 15,
          description: 'Biji kopi single origin Aceh Gayo proses natural.',
          attributes: {},
        },
      ]);

      await ask();

      const prompt = getSystemPrompt();
      expect(prompt).toContain('KATALOG PRODUK, VARIASI & STOK REAL-TIME');
      expect(prompt).toContain('Kopi Arabika Gayo 250gr');
      expect(prompt).toContain('Kategori: Makanan & Minuman');
      expect(prompt).toContain('Harga Rp 85.000');
      expect(prompt).toContain('[Total Stok: 15]');
      expect(prompt).toContain('Biji kopi single origin Aceh Gayo');
    });

    it('menyertakan rincian variasi: nama, harga per opsi & stok per opsi', async () => {
      setup([
        {
          name: 'Kemeja Flanel',
          category: 'Pakaian',
          price: 135000,
          stock: 42,
          attributes: {
            hasVariations: true,
            variations: [
              { name: 'Hitam - M', price: 135000, stock: 20 },
              { name: 'Merah - XL', price: 145000, stock: 7 },
            ],
          },
        },
      ]);

      await ask();

      const prompt = getSystemPrompt();
      expect(prompt).toContain('Pilihan Variasi');
      expect(prompt).toContain('Hitam - M: Rp 135.000 (Stok: 20)');
      expect(prompt).toContain('Merah - XL: Rp 145.000 (Stok: 7)');
    });

    it('menyertakan foto + deskripsinya & video, sekaligus membuang URL blob:/data:', async () => {
      setup([
        {
          name: 'Rumah Tipe 36',
          category: 'Properti',
          price: 192800000,
          stock: 3,
          attributes: {
            images: [
              { url: '/uploads/depan.jpg', description: 'Tampak depan rumah' },
              'blob:http://localhost/abc', // sisa upload gagal — harus difilter
              { url: '/uploads/dapur.jpg', description: 'Dapur bersih' },
            ],
            videoUrl: '/uploads/tour.mp4',
          },
        },
      ]);

      await ask();

      const prompt = getSystemPrompt();
      expect(prompt).toContain('Harga Rp 192.800.000');
      expect(prompt).toContain('Foto Produk (2 foto)');
      expect(prompt).toContain('/uploads/depan.jpg — Tampak depan rumah');
      expect(prompt).toContain('/uploads/dapur.jpg — Dapur bersih');
      expect(prompt).toContain('Video Demo Produk: Tersedia (/uploads/tour.mp4)');
      expect(prompt).not.toContain('blob:');
    });

    it('produk tanpa kategori & harga tetap dirender aman (Umum, Rp 0)', async () => {
      setup([
        {
          name: 'Produk Tanpa Metadata',
          price: null,
          stock: 0,
          attributes: {},
        },
      ]);

      await ask();

      const prompt = getSystemPrompt();
      expect(prompt).toContain('Kategori: Umum');
      expect(prompt).toContain('Harga Rp 0');
      expect(prompt).toContain('[Total Stok: 0]');
    });

    it('katalog kosong → prompt menandai DATABASE TOKO KOSONG (arahkan ke marketing)', async () => {
      setup([]);

      await ask();

      const prompt = getSystemPrompt();
      expect(prompt).toContain('DATABASE TOKO KOSONG');
      expect(prompt).not.toContain('KATALOG PRODUK, VARIASI & STOK REAL-TIME');
    });

    it('query katalog selalu ter-scope tenantId (tidak bocor antar tenant)', async () => {
      setup([
        {
          name: 'Produk Tenant Alpha',
          category: 'Umum',
          price: 10000,
          stock: 1,
          attributes: {},
        },
      ]);

      await ask();

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-123' },
        take: 30,
      });
      expect(getSystemPrompt()).toContain('Produk Tenant Alpha');
    });
  });
});
