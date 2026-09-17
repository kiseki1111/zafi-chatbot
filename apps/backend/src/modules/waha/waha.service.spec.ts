import { Test, TestingModule } from '@nestjs/testing';
import { WahaService } from './waha.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma/prisma.service';

describe('WahaService', () => {
  let service: WahaService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => defaultValue ?? null),
  };

  const mockPrismaService = {
    whatsappInstance: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    tenant: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
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
});
