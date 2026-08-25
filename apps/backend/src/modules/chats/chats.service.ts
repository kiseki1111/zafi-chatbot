import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

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

    return conversations.map(c => {
      let realPhone = c.contact?.phone;
      if (realPhone && realPhone.endsWith('@lid') && c.messages && c.messages.length > 0) {
        const msg = c.messages[0];
        const meta = msg.metadata as any;
        if (meta?._data?.key?.remoteJidAlt) {
           realPhone = meta._data.key.remoteJidAlt;
        }
      }
      return {
        ...c,
        contactName: c.contact?.name,
        contactNumber: realPhone
      };
    });
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
