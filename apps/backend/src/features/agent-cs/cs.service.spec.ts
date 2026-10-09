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
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('Produk unggulan: Kopi Gayo');
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
      mockAgentShared.analyzeImage.mockResolvedValue('Foto bungkus kopi robusta 250gr');
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

      expect(mockAgentShared.analyzeImage).toHaveBeenCalledWith('http://example.com/photo.jpg');
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
      mockAgentShared.transcribeAudio.mockResolvedValue('Berapa harga kopi robusta?');

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
  });
});
