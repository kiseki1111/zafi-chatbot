import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { DataAgentService } from '../../features/knowledge-ingest/data-agent.service';

describe('KnowledgeController', () => {
  let controller: KnowledgeController;

  const mockKnowledgeService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    createText: jest.fn(),
    createDocument: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockDataAgentService = {
    ingestDocument: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeController],
      providers: [
        { provide: KnowledgeService, useValue: mockKnowledgeService },
        { provide: DataAgentService, useValue: mockDataAgentService },
      ],
    }).compile();

    controller = module.get<KnowledgeController>(KnowledgeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
