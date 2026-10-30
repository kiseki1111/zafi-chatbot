import { Test, TestingModule } from '@nestjs/testing';
import { CsService } from '../src/features/agent-cs/cs.service';
import { WahaService } from '../src/modules/waha/waha.service';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AgentSharedService } from '../src/core/agent-shared/agent-shared.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Chaos & E2E Suite: Media Video Guard & Stale Links Immunity', () => {
  let csService: CsService;
  let wahaService: WahaService;

  const mockPrisma = {
    whatsappInstance: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    contact: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfig = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'PUBLIC_URL') return 'https://api.zafii.tech';
      return defaultValue ?? 'http://localhost:3000';
    }),
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

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsService,
        WahaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AgentSharedService, useValue: mockAgentShared },
      ],
    }).compile();

    csService = module.get<CsService>(CsService);
    wahaService = module.get<WahaService>(WahaService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.whatsappInstance.update.mockResolvedValue({});
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockedAxios.post.mockResolvedValue({
      data: { success: true, id: 'mock-waha-ok' },
    });
  });

  // =========================================================================
  // SUITE 1: CS Service Media Link vs Direct Video Processing
  // =========================================================================
  describe('Suite 1: CS Service Media Link vs Direct Video Processing', () => {
    it('harus mempertahankan file video langsung (.mp4 atau /uploads/) di array videos saat diminta user', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-1',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        name: 'Zafi Property',
      });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue(
        'Video Arah: /uploads/video-zafi-residence.mp4',
      );
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Ini video unitnya ya Kak.',
          images: [],
          videos: [
            {
              url: '/uploads/video-zafi-residence.mp4',
              caption: 'Video Tour Unit',
            },
          ],
        }),
      );

      const response = await csService.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'wa-property',
        text: 'ada video menuju lokasi zafi residence?',
      });

      expect(response.videos).toHaveLength(1);
      expect(response.videos[0].url).toBe('/uploads/video-zafi-residence.mp4');
      expect(response.text).toBe('Ini video unitnya ya Kak.');
    });

    it('harus memindahkan tautan media sosial (Instagram Reel) dari videos ke teks balasan agar WhatsApp render link preview', async () => {
      const reelUrl =
        'https://www.instagram.com/reel/DVkx0HGjnEi/?utm_source=ig_web_copy_link';
      mockAgentShared.getRecentContext.mockResolvedValue([]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-1',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        name: 'Zafi Property',
      });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue(
        `Video IG: ${reelUrl}`,
      );
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Halo Kak! Berikut video arah menuju Zafi Residence:',
          images: [],
          videos: [
            {
              url: reelUrl,
              caption: 'Video Arah Menuju Zafi Residence',
            },
          ],
        }),
      );

      const response = await csService.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'wa-property',
        text: 'minta video arah ke lokasi dong',
      });

      // Array videos wajib kosong agar WAHA tidak mencoba download HTML instagram
      expect(response.videos).toEqual([]);
      // Tautan harus disertakan langsung di teks agar WhatsApp menampilkan rich link preview
      expect(response.text).toContain(reelUrl);
      expect(response.text).toContain('Video Arah Menuju Zafi Residence');
    });

    it('harus mengosongkan array videos jika pelanggan TIDAK meminta video', async () => {
      mockAgentShared.getRecentContext.mockResolvedValue([]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-1',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        name: 'Zafi Property',
      });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue(
        'Video: /uploads/promo.mp4',
      );
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      // AI berinisiatif kirim video padahal customer cuma tanya harga
      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Harga rumah mulai 190 jutaan Kak.',
          images: [],
          videos: [{ url: '/uploads/promo.mp4', caption: 'Promo' }],
        }),
      );

      const response = await csService.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'wa-property',
        text: 'berapa harga rumahnya kak?',
      });

      // Strict Guard: user tidak menanyakan video, maka videos wajib kosong
      expect(response.videos).toEqual([]);
    });

    it('harus menolak dan membersihkan link video lama yang ada di riwayat chat jika dokumen sudah dihapus dari knowledge base', async () => {
      const deletedReel = 'https://www.instagram.com/reel/DVkx0HGjnEi/';
      // Riwayat pesan masa lalu sebelum dihapus
      mockAgentShared.getRecentContext.mockResolvedValue([
        { senderType: 'bot', content: `Ini videonya kak ${deletedReel}` },
      ]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-1',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        name: 'Zafi Property',
      });
      // Knowledge base saat ini KOSONG (karena dokumen sudah dihapus oleh tester)
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue('');
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      // LLM mencoba mengulang link lama dari chat history
      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: `Ini videonya lagi ya kak: ${deletedReel}`,
          images: [],
          videos: [{ url: deletedReel, caption: 'Video Zafi' }],
        }),
      );

      const response = await csService.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'wa-property',
        text: 'ada videonya kak?',
      });

      // Video harus ditolak karena tidak ada di knowledge base aktif
      expect(response.videos).toEqual([]);
      // Tautan usang di teks balasan juga harus dibersihkan
      expect(response.text).not.toContain(deletedReel);

      // Prompt yang dikirim ke LLM harus menetralkan tautan usang
      expect(mockAgentShared.callLLM).toHaveBeenCalledWith(
        expect.stringContaining(
          '[tautan media sebelumnya telah dihapus dari database]',
        ),
        expect.any(String),
        true,
      );
    });
  });

  // =========================================================================
  // SUITE 2: WahaService Video & Media Safeguards
  // =========================================================================
  describe('Suite 2: WahaService Video & Media Safeguards', () => {
    it('sendVideo: harus langsung mengalihkan URL Instagram ke sendMessage / sendText', async () => {
      const igUrl = 'https://www.instagram.com/reel/DVkx0HGjnEi/';
      await wahaService.sendVideo(
        'test-session',
        '628111222333',
        igUrl,
        'Tonton Reel',
      );

      // Tidak boleh memanggil endpoint video biner WAHA
      expect(mockedAxios.post).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/sendVideo'),
        expect.anything(),
        expect.anything(),
      );
      // Harus memanggil sendText
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/sendText'),
        expect.objectContaining({
          session: 'test-session',
          chatId: '628111222333',
          text: expect.stringContaining(igUrl),
        }),
        expect.any(Object),
      );
    });

    it('sendVideoFile: harus langsung mengalihkan URL YouTube ke sendMessage / sendText', async () => {
      const ytUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await wahaService.sendVideoFile(
        'test-session',
        '628111222333',
        ytUrl,
        'Video Tour',
      );

      expect(mockedAxios.post).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/sendFile'),
        expect.anything(),
        expect.anything(),
      );
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/sendText'),
        expect.objectContaining({
          text: expect.stringContaining(ytUrl),
        }),
        expect.any(Object),
      );
    });

    it('sendMedia: harus mengenali tautan TikTok dan mengalihkannya ke sendMessage / sendText', async () => {
      const ttUrl = 'https://www.tiktok.com/@property/video/1234567890';
      await wahaService.sendMedia(
        'test-session',
        '628111222333',
        ttUrl,
        'TikTok Tour',
      );

      expect(mockedAxios.post).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/sendImage'),
        expect.anything(),
        expect.anything(),
      );
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/sendText'),
        expect.objectContaining({
          text: expect.stringContaining(ttUrl),
        }),
        expect.any(Object),
      );
    });

    it('sendVideo: harus menolak jika respon unduhan adalah text/html dan mengalihkan ke sendText', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('<!DOCTYPE html><html>Login to Instagram</html>'),
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });

      await wahaService.sendVideo(
        'test-session',
        '628111222333',
        'https://external-site.com/video-preview',
        'Video Lokasi',
      );

      // Tidak boleh mengirim HTML ke /api/sendVideo
      expect(mockedAxios.post).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/sendVideo'),
        expect.anything(),
        expect.anything(),
      );
      // Harus kirim sebagai teks tautan
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/sendText'),
        expect.objectContaining({
          text: expect.stringContaining(
            'https://external-site.com/video-preview',
          ),
        }),
        expect.any(Object),
      );
    });

    it('sendVideo: harus mengirim biner jika file valid video/mp4', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('RAW_MP4_BINARY_DATA_STREAM'),
        headers: { 'content-type': 'video/mp4' },
      });

      await wahaService.sendVideo(
        'test-session',
        '628111222333',
        'https://cdn.property.com/valid-unit-tour.mp4',
        'Video Sah',
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/sendVideo'),
        expect.objectContaining({
          file: expect.objectContaining({
            mimetype: 'video/mp4',
            data: Buffer.from('RAW_MP4_BINARY_DATA_STREAM').toString('base64'),
          }),
        }),
        expect.any(Object),
      );
    });
  });

  // =========================================================================
  // SUITE 3: CHAOS ENGINEERING (Network Failure, Malformed Data & Stress Burst)
  // =========================================================================
  describe('Suite 3: Chaos Engineering Scenarios', () => {
    it('[Chaos 1: HTTP 500 Server Error]', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 500, data: 'Internal Server Error' },
      });

      // Harap tidak meledak tak terkendali saat server luar error 500
      const result = await wahaService.sendVideo(
        'test-session',
        '628111222333',
        'https://broken-cdn.com/virtual-tour.mp4',
        'Kompilasi Unit',
      );

      expect(result).toBeDefined();
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/sendVideo'),
        expect.objectContaining({
          file: expect.objectContaining({
            url: 'https://broken-cdn.com/virtual-tour.mp4',
          }),
        }),
        expect.any(Object),
      );
    });

    it('[Chaos 2: Network Timeout (ETIMEDOUT)]', async () => {
      mockedAxios.get.mockRejectedValueOnce(
        new Error('connect ETIMEDOUT 104.21.5.12:443'),
      );

      const result = await wahaService.sendVideo(
        'test-session',
        '628111222333',
        'https://timeout-host.com/walkthrough.mp4',
        'Video Arah',
      );

      expect(result).toBeDefined();
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/sendVideo'),
        expect.objectContaining({
          file: expect.objectContaining({
            url: 'https://timeout-host.com/walkthrough.mp4',
          }),
        }),
        expect.any(Object),
      );
    });

    it('[Chaos 3: Cloudflare Bot Block (403 Returning HTML Page)]', async () => {
      // Cloudflare menolak scraping dan mengembalikan halaman HTML dengan status 200/403
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from(
          '<!DOCTYPE html><html><title>Just a moment...</title>Cloudflare challenge</html>',
        ),
        headers: { 'content-type': 'text/html; charset=UTF-8' },
      });

      await wahaService.sendVideo(
        'test-session',
        '628111222333',
        'https://protected-property.com/video',
        'Kamera Lapangan',
      );

      // Harus dicegah agar tidak mengirim file HTML sebagai video 0 detik
      expect(mockedAxios.post).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/sendVideo'),
        expect.anything(),
        expect.anything(),
      );
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/sendText'),
        expect.objectContaining({
          text: expect.stringContaining('https://protected-property.com/video'),
        }),
        expect.any(Object),
      );
    });

    it('[Chaos 4: Extreme Malformed & Malicious URLs]', async () => {
      const maliciousUrls = [
        'javascript:alert(1)',
        'data:text/html;base64,PHNjcmlwdD4=',
        'https://' + 'a'.repeat(2000) + '.com/video.mp4',
        'https://zafi.id/video?q=' + encodeURIComponent('🔥🏠✨'.repeat(50)),
      ];

      for (const url of maliciousUrls) {
        mockedAxios.get.mockRejectedValueOnce(new Error('Invalid URL'));
        await expect(
          wahaService.sendVideo(
            'test-session',
            '628111222333',
            url,
            'Chaos Video',
          ),
        ).resolves.not.toThrow();
      }
    });

    it('[Chaos 5: Chat History Memory Flooding Attack (50 Old Links)]', async () => {
      // Simulasi history dibanjiri 50 link media lama yang sudah dihapus
      const floodedHistory = Array.from({ length: 50 }, (_, i) => ({
        senderType: i % 2 === 0 ? 'bot' : 'customer',
        content: `Pesan ke-${i} dengan link https://www.instagram.com/reel/staleReelId${i}/`,
      }));

      mockAgentShared.getRecentContext.mockResolvedValue(floodedHistory);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-1',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        name: 'Zafi Property',
      });
      // Di database aktif saat ini, TIDAK ADA satu pun dari 50 link tersebut
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue(
        'Database bersih.',
      );
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      // LLM mengutip salah satu link dari tumpukan banjir history
      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Ini videonya kak https://www.instagram.com/reel/staleReelId25/',
          images: [],
          videos: [
            {
              url: 'https://www.instagram.com/reel/staleReelId25/',
              caption: 'Old Video',
            },
          ],
        }),
      );

      const response = await csService.handleMessage({
        senderId: '628123456789@c.us',
        sessionName: 'wa-property',
        text: 'minta video unitnya dong',
      });

      // Semua 50 link harus tertolak dan ternetralisir
      expect(response.videos).toEqual([]);
      expect(response.text).not.toContain(
        'https://www.instagram.com/reel/staleReelId25/',
      );
    });

    it('[Chaos 6: High-Concurrency Burst (30 Simultaneous Video Inquiries)]', async () => {
      const igUrl = 'https://www.instagram.com/reel/DVkx0HGjnEi/';
      mockAgentShared.getRecentContext.mockResolvedValue([]);
      mockPrisma.whatsappInstance.findUnique.mockResolvedValue({
        instanceName: 'wa-property',
        tenantId: 'tenant-1',
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        name: 'Zafi Property',
      });
      mockAgentShared.retrieveRelevantKnowledge.mockResolvedValue(
        `Video: ${igUrl}`,
      );
      mockAgentShared.getAvailabilityContext.mockResolvedValue(null);

      mockAgentShared.callLLM.mockResolvedValue(
        JSON.stringify({
          text: 'Berikut videonya Kak:',
          images: [],
          videos: [{ url: igUrl, caption: 'Video Lokasi' }],
        }),
      );

      // 30 pesan masuk serentak
      const promises = Array.from({ length: 30 }, (_, i) =>
        csService.handleMessage({
          senderId: `628123456${i}@c.us`,
          sessionName: 'wa-property',
          text: `Halo ${i}, minta video lokasi dong`,
        }),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(30);
      for (const res of results) {
        expect(res.videos).toEqual([]); // Semua lolos sanitasi video biner
        expect(res.text).toContain(igUrl); // Semua dipindahkan ke link preview
      }
    });
  });
});
