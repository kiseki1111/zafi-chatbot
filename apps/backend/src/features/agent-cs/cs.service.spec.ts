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
      expect(response.text).toContain('https://www.instagram.com/reel/DVkx0HGjnEi/');
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
          content: 'Ini videonya kak https://www.instagram.com/reel/DVkx0HGjnEi/',
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
      expect(response.text).not.toContain('https://www.instagram.com/reel/DVkx0HGjnEi/');

      // Prompt ke LLM harus menetralkan link lama dari chat history
      expect(mockAgentShared.callLLM).toHaveBeenCalledWith(
        expect.stringContaining('[tautan media sebelumnya telah dihapus dari database]'),
        expect.any(String),
        true,
      );
    });
  });
});
