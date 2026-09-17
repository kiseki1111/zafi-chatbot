import { Test, TestingModule } from '@nestjs/testing';
import { WahaController } from './waha.controller';
import { WahaService } from './waha.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OmnichannelQueueService } from '../../core/omnichannel/omnichannel-queue.service';

describe('WahaController', () => {
  let controller: WahaController;

  const mockWahaService = {
    getInstances: jest.fn(),
    createInstance: jest.fn(),
    startSession: jest.fn(),
    stopSession: jest.fn(),
    getQrCode: jest.fn(),
    getQrCodeBuffer: jest.fn(),
    sendMessage: jest.fn(),
  };

  const mockPrismaService = {
    whatsappInstance: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    message: {
      updateMany: jest.fn(),
    },
  };

  const mockOmnichannelQueue = {
    addMessage: jest.fn(),
  };

  beforeEach(async () => {
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
});
