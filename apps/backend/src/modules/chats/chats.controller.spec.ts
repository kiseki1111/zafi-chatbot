import { Test, TestingModule } from '@nestjs/testing';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';

describe('ChatsController - Unit Tests (Feature 1 Profile & Bio)', () => {
  let controller: ChatsController;

  const mockChatsService = {
    getConversations: jest.fn(),
    getMessages: jest.fn(),
    getContactProfile: jest.fn(),
    sendMessage: jest.fn(),
    takeoverConversation: jest.fn(),
    releaseConversation: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatsController],
      providers: [{ provide: ChatsService, useValue: mockChatsService }],
    }).compile();

    controller = module.get<ChatsController>(ChatsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Feature 1: GET /:id/profile', () => {
    it('harus memanggil chatsService.getContactProfile dengan conversation id', async () => {
      const mockResult = {
        contactId: 'contact-01',
        name: 'Budi Santoso',
        phone: '628123456789',
        profilePicture: 'https://cdn.whatsapp.net/pfp/budi.jpg',
        about: 'Menatap masa depan cerah',
        instanceName: 'zafi-cs',
      };

      mockChatsService.getContactProfile.mockResolvedValueOnce(mockResult);

      const res = await controller.getContactProfile('conv-abc');

      expect(mockChatsService.getContactProfile).toHaveBeenCalledWith('conv-abc');
      expect(res).toEqual(mockResult);
    });
  });
});
