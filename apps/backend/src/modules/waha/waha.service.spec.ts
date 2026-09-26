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
});
