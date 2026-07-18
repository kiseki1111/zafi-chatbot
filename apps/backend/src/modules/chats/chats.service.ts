import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class ChatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getConversations(instanceName?: string) {
    const where = instanceName ? { instanceName } : {};
    const conversations = await this.prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        contact: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return conversations.map(c => ({
      ...c,
      contactName: c.contact?.name,
      contactNumber: c.contact?.phone
    }));
  }

  async getMessages(conversationId: string, skip: number = 0, take: number = 20) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        sender: {
          select: { id: true, name: true },
        },
      },
    });

    return messages.reverse(); // Return oldest first for chat UI
  }
}
