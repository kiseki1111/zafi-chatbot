import { Test, TestingModule } from '@nestjs/testing';
import { WahaService } from './waha.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma/prisma.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WahaService - Unit Tests (Features 1, 2, 6)', () => {
  let service: WahaService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => defaultValue ?? 'http://localhost:3000'),
  };

  const mockPrismaService = {
    whatsappInstance: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    tenant: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.whatsappInstance.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WahaService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<WahaService>(WahaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Feature 2: Tanda Baca (sendSeen) & Typing Presence', () => {
    it('harus memanggil /api/startTyping dengan format chatId yang benar', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      await service.sendTypingPresence('test-session', '628123456789');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/startTyping'),
        expect.objectContaining({
          session: 'test-session',
          chatId: '628123456789@c.us',
        }),
        expect.any(Object),
      );
    });

    it('harus memanggil /api/sendSeen untuk memicu blue ticks', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      await service.sendSeen('test-session', '628123456789', 'msg-12345');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/sendSeen'),
        expect.objectContaining({
          session: 'test-session',
          chatId: '628123456789@c.us',
          messageId: 'msg-12345',
        }),
        expect.any(Object),
      );
    });
  });

  describe('Feature 6: Auto-Reject Call', () => {
    it('harus memanggil endpoint reject call WAHA dengan callId', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { status: 'rejected' } });

      const res = await service.rejectCall('test-session', 'call-999');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/test-session/calls/reject'),
        { callId: 'call-999' },
        expect.any(Object),
      );
      expect(res).toEqual({ status: 'rejected' });
    });
  });

  describe('Feature 1: Foto Profil (PFP) & Status Bio (About)', () => {
    it('harus mengambil URL foto profil dari /api/contacts/profile-picture', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { url: 'https://cdn.whatsapp.net/pfp/user1.jpg' },
      });

      const pfpUrl = await service.getContactProfilePicture('test-session', '628123456789');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/contacts/profile-picture'),
        expect.objectContaining({
          params: { session: 'test-session', contactId: '628123456789@c.us' },
        }),
      );
      expect(pfpUrl).toBe('https://cdn.whatsapp.net/pfp/user1.jpg');
    });

    it('harus mengambil status bio kontak dari /api/contacts/about', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { about: 'Available for property consultation' },
      });

      const about = await service.getContactAbout('test-session', '628123456789');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/contacts/about'),
        expect.objectContaining({
          params: { session: 'test-session', contactId: '628123456789@c.us' },
        }),
      );
      expect(about).toBe('Available for property consultation');
    });
  });

  describe('Feature 7: Media & Video Guard (Mencegah pengiriman file HTML rusak)', () => {
    it('harus mengalihkan sendVideo ke sendText jika URL adalah tautan media sosial (Instagram)', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: true, id: 'msg-text-1' } });

      await service.sendVideo(
        'test-session',
        '628123456789',
        'https://www.instagram.com/reel/DVkx0HGjnEi/?utm_source=ig_web_copy_link',
        'Video Arah Lokasi',
      );

      // Tidak boleh memanggil /api/sendVideo atau /api/sendFile
      expect(mockedAxios.post).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/sendVideo'),
        expect.anything(),
        expect.anything(),
      );
      expect(mockedAxios.post).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/sendFile'),
        expect.anything(),
        expect.anything(),
      );
      // Harus memanggil /api/sendText dengan teks berisi tautan
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/sendText'),
        expect.objectContaining({
          session: 'test-session',
          chatId: '628123456789',
          text: expect.stringContaining('https://www.instagram.com/reel/DVkx0HGjnEi/'),
        }),
        expect.any(Object),
      );
    });

    it('harus mengalihkan sendVideo ke sendText jika hasil unduhan URL adalah text/html', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: true, id: 'msg-text-2' } });
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('<!DOCTYPE html><html><body>Halaman Login</body></html>'),
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }); // axios.get videoUrl

      await service.sendVideo(
        'test-session',
        '628123456789',
        'https://example-property.com/video-page',
        'Video Lokasi',
      );

      // Tidak boleh mengirim ke /api/sendVideo
      expect(mockedAxios.post).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/sendVideo'),
        expect.anything(),
        expect.anything(),
      );
      // Harus dialihkan ke sendText
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/sendText'),
        expect.objectContaining({
          session: 'test-session',
          chatId: '628123456789',
          text: expect.stringContaining('https://example-property.com/video-page'),
        }),
        expect.any(Object),
      );
    });

    it('harus mengirim ke /api/sendVideo jika URL mengembalikan video/mp4 biner', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: true, id: 'msg-video-1' } });
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-mp4-binary-content'),
        headers: { 'content-type': 'video/mp4' },
      }); // axios.get videoUrl

      await service.sendVideo(
        'test-session',
        '628123456789',
        'https://storage.example.com/tour.mp4',
        'Video Unit',
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/sendVideo'),
        expect.objectContaining({
          session: 'test-session',
          chatId: '628123456789',
          file: expect.objectContaining({
            mimetype: 'video/mp4',
            data: Buffer.from('fake-mp4-binary-content').toString('base64'),
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('Feature 8: Voice Note / Audio Media Download (downloadAndStoreMedia)', () => {
    it('harus mengunduh voice note dari WAHA dan menyimpan sebagai file lokal .ogg', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('fake-audio-binary'),
        headers: { 'content-type': 'audio/ogg; codecs=opus' },
      });

      const res = await service.downloadAndStoreMedia(
        'zafi-property',
        'msg-ptt-123',
        'http://localhost:3000/api/files/zafi-property/voice.oga',
      );

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/files/zafi-property/voice.oga'),
        expect.objectContaining({
          responseType: 'arraybuffer',
        }),
      );
      expect(res).toMatch(/^\/uploads\/incoming\/\d+-\d+\.ogg$/);
    });

    it('harus mengembalikan URL yang sama jika mediaUrl sudah merupakan path lokal (/uploads/)', async () => {
      const res = await service.downloadAndStoreMedia(
        'zafi-property',
        'msg-local-123',
        '/uploads/incoming/existing-voice.ogg',
      );

      expect(res).toBe('/uploads/incoming/existing-voice.ogg');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });
});
