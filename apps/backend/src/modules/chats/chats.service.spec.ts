import { Test, TestingModule } from '@nestjs/testing';
import { ChatsService } from './chats.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WahaService } from '../waha/waha.service';

describe('ChatsService', () => {
  let service: ChatsService;

  const mockPrismaService = {
    conversation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    contact: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockWahaService = {
    sendMessage: jest.fn(),
    getSessionStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WahaService, useValue: mockWahaService },
      ],
    }).compile();

    service = module.get<ChatsService>(ChatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
