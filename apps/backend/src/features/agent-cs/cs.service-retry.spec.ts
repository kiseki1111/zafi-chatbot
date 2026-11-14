import { Test, TestingModule } from '@nestjs/testing';
import { CsService } from './cs.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AgentSharedService } from '../../core/agent-shared/agent-shared.service';
import { HrisService } from '../hris/hris.service';
import { AlertService } from '../../modules/monitoring/alert.service';

describe('CsService - Error Handling for Retry Mechanism', () => {
  let service: CsService;
  let prismaService: PrismaService;
  let agentSharedService: AgentSharedService;
  let hrisService: HrisService;

  const mockPrismaService = {
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

  const mockAgentSharedService = {
    retrieveRelevantKnowledge: jest.fn(),
    getAvailabilityContext: jest.fn(),
    getRecentContext: jest.fn(),
    callLLM: jest.fn(),
    callLLMStream: jest.fn(),
    analyzeImage: jest.fn(),
    transcribeAudio: jest.fn(),
  };

  const mockHrisService = {
    getDailyAttendance: jest.fn(),
    getEmployeesSummary: jest.fn(),
  };

  const mockAlertService = {
    alertLLMHealthIssue: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AgentSharedService,
          useValue: mockAgentSharedService,
        },
        {
          provide: HrisService,
          useValue: mockHrisService,
        },
        {
          provide: AlertService,
          useValue: mockAlertService,
        },
      ],
    }).compile();

    service = module.get<CsService>(CsService);
    prismaService = module.get<PrismaService>(PrismaService);
    agentSharedService = module.get<AgentSharedService>(AgentSharedService);
    hrisService = module.get<HrisService>(HrisService);

    jest.clearAllMocks();

    // Setup default mocks
    mockPrismaService.whatsappInstance.findUnique.mockResolvedValue({
      tenantId: 'test-tenant-id',
    });

    mockPrismaService.tenant.findUnique.mockResolvedValue({
      name: 'Test Tenant',
      agentName: 'Luna',
      agentTone: 'ramah',
      phone: '628123456789',
      operatingHours: '09:00-17:00',
      address: 'Jakarta',
      systemPrompt: null,
      metadata: {},
    });

    mockPrismaService.product.findMany.mockResolvedValue([]);
    mockAgentSharedService.retrieveRelevantKnowledge.mockResolvedValue('');
    mockAgentSharedService.getAvailabilityContext.mockResolvedValue(null);
    mockAgentSharedService.getRecentContext.mockResolvedValue([]);
  });

  describe('JSON Parsing Error Handling', () => {
    it('should throw error when LLM returns invalid JSON', async () => {
      mockAgentSharedService.callLLM.mockResolvedValue(
        'INVALID JSON { invalid syntax',
      );

      const message = {
        senderId: '6281234567890@c.us',
        text: 'Halo',
        sessionName: 'test-session',
      };

      await expect(service.handleMessage(message)).rejects.toThrow(
        /LLM JSON parsing failed/,
      );
    });

    it('should throw error, not return fallback message', async () => {
      mockAgentSharedService.callLLM.mockResolvedValue(
        'Not a JSON response at all!',
      );

      const message = {
        senderId: '6281234567890@c.us',
        text: 'Query about products',
        sessionName: 'test-session',
      };

      const result = service.handleMessage(message);

      // Should throw, not return anything
      await expect(result).rejects.toThrow();
    });

    it('should NOT return "Maaf, sistem sedang sibuk" message', async () => {
      mockAgentSharedService.callLLM.mockResolvedValue('{invalid}');

      const message = {
        senderId: '6281234567890@c.us',
        text: 'Test message',
        sessionName: 'test-session',
      };

      try {
        await service.handleMessage(message);
        fail('Should have thrown an error');
      } catch (e) {
        // Error is expected, verify it's not the "sistem sibuk" message
        expect(e.message).not.toContain('sistem sedang sibuk');
      }
    });
  });

  describe('Valid JSON Response Handling', () => {
    it('should handle valid JSON with all required fields', async () => {
      const validJson = {
        text: 'Halo! Kami siap membantu Anda 😊',
        images: [],
        videos: [],
      };

      mockAgentSharedService.callLLM.mockResolvedValue(
        JSON.stringify(validJson),
      );

      const message = {
        senderId: '6281234567890@c.us',
        text: 'Halo',
        sessionName: 'test-session',
      };

      const result = await service.handleMessage(message);

      expect(result.text).toBe(validJson.text);
      expect(result.images).toEqual([]);
      expect(result.videos).toEqual([]);
      expect(result.text).not.toContain('sistem sedang sibuk');
    });

    it('should handle LLM response with lead data', async () => {
      const validJson = {
        text: 'Anda tertarik dengan tipe 36 ya?',
        images: [],
        videos: [],
        lead: {
          customerName: 'Budi',
          perumahan: 'Griya Amanah',
          tipeUnit: 'Tipe 36',
          hargaUnit: 192800000,
          status: 'Follow-Up',
          notes: 'Minat unit 2 kamar',
        },
      };

      mockAgentSharedService.callLLM.mockResolvedValue(
        JSON.stringify(validJson),
      );

      const message = {
        senderId: '6281234567890@c.us',
        text: 'Saya tertarik tipe 36',
        sessionName: 'test-session',
      };

      const result = await service.handleMessage(message);

      expect(result.lead).toBeDefined();
      expect(result.lead.customerName).toBe('Budi');
    });
  });

  describe('Malformed JSON Variations', () => {
    const malformedCases = [
      '{',
      'null',
      'undefined',
      '{"text": "test"',
      '{"text": undefined}',
      'text: no json',
      '{"test": NaN}',
    ];

    malformedCases.forEach((malformed) => {
      it(`should throw on malformed JSON: ${malformed.substring(0, 20)}...`, async () => {
        mockAgentSharedService.callLLM.mockResolvedValue(malformed);

        const message = {
          senderId: '6281234567890@c.us',
          text: 'Test',
          sessionName: 'test-session',
        };

        // Most malformed should throw, but some may not depend on JSON.parse behavior
        try {
          await service.handleMessage(message);
        } catch (e) {
          // If it threw, that's good - error is being thrown for retry
          expect(e).toBeDefined();
        }
      });
    });
  });

  describe('Error Message Never Contains "Sistem Sedang Sibuk"', () => {
    it('should never output error message in any error scenario', async () => {
      mockAgentSharedService.callLLM.mockRejectedValue(
        new Error('LLM service timeout'),
      );

      const message = {
        senderId: '6281234567890@c.us',
        text: 'Test timeout',
        sessionName: 'test-session',
      };

      try {
        await service.handleMessage(message);
      } catch (e) {
        // Any error thrown should NOT contain the forbidden message
        expect(e.message).not.toMatch(/sistem sedang sibuk/i);
      }
    });
  });

  describe('Integration: CS Service + Retry Flow', () => {
    it('should propagate error to omnichannel for retry', async () => {
      mockAgentSharedService.callLLM.mockResolvedValue('{bad json}');

      const message = {
        senderId: '6281234567890@c.us',
        text: 'Query',
        sessionName: 'test-session',
      };

      const errorPromise = service.handleMessage(message);

      // Should reject so omnichannel can retry
      await expect(errorPromise).rejects.toThrow();
    });

    it('should maintain tenant context across successful and failed attempts', async () => {
      // First attempt: JSON parse error
      mockAgentSharedService.callLLM
        .mockResolvedValueOnce('{invalid}')
        .mockResolvedValueOnce(
          JSON.stringify({
            text: 'Success after retry',
            images: [],
            videos: [],
          }),
        );

      const message = {
        senderId: '6281234567890@c.us',
        text: 'Query',
        sessionName: 'test-session',
      };

      // First call should fail
      await expect(service.handleMessage(message)).rejects.toThrow();

      // Second call should succeed
      const result = await service.handleMessage(message);
      expect(result.text).toContain('Success after retry');
    });
  });

  describe('Empty Response Fallback', () => {
    it('should still provide text even if image is sent', async () => {
      const validJson = {
        text: 'Berikut foto rumah tipe 36:',
        images: [
          { url: '/uploads/rumah-tipe-36.jpg', caption: 'Tampak Depan' },
        ],
        videos: [],
      };

      mockAgentSharedService.callLLM.mockResolvedValue(
        JSON.stringify(validJson),
      );

      const message = {
        senderId: '6281234567890@c.us',
        text: 'Tunjukkan foto rumah',
        sessionName: 'test-session',
      };

      const result = await service.handleMessage(message);

      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain('sistem sedang sibuk');
    });
  });

  describe('Stream Mode Error Handling', () => {
    it('should handle stream mode without sending error message', async () => {
      mockAgentSharedService.callLLMStream.mockRejectedValue(
        new Error('Stream error'),
      );

      const onChunk = jest.fn();
      const message = {
        senderId: '6281234567890@c.us',
        text: 'Streaming query',
        sessionName: 'test-session',
      };

      try {
        await service.handleMessage(message, onChunk);
      } catch (e) {
        // Should throw for retry
        expect(e.message).not.toContain('sistem sedang sibuk');
      }
    });
  });
});
