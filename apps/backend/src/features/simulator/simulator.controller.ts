import {
  Controller,
  Post,
  Body,
  Res,
  Logger,
  Get,
  Param,
} from '@nestjs/common';
import type { Response } from 'express';
import { AgentAssistantService } from '../agent-assistant/agent-assistant.service';
import { CsService } from '../agent-cs/cs.service';
import { PrismaService } from '../../core/prisma/prisma.service';

@Controller('api/v1/agent/simulator')
export class SimulatorController {
  private readonly logger = new Logger(SimulatorController.name);
  private readonly INSTANCE_NAME = 'telegram-dev-bot';

  constructor(
    private readonly agentAssistantService: AgentAssistantService,
    private readonly csService: CsService,
    private readonly prisma: PrismaService,
  ) {}

  private async saveMessageToDb(
    chatId: string,
    senderName: string,
    text: string,
    senderType: 'customer' | 'bot',
  ) {
    try {
      const msgId =
        Date.now().toString() + Math.floor(Math.random() * 1000).toString();
      const contact = await this.prisma.contact.upsert({
        where: { phone: chatId },
        update: { name: senderName },
        create: { phone: chatId, name: senderName },
      });

      const conversation = await this.prisma.conversation.upsert({
        where: {
          instanceName_contactId: {
            instanceName: this.INSTANCE_NAME,
            contactId: contact.id,
          },
        },
        update: {
          lastMessageAt: new Date(),
          unreadCount: senderType === 'customer' ? { increment: 1 } : undefined,
        },
        create: {
          instanceName: this.INSTANCE_NAME,
          contactId: contact.id,
          unreadCount: senderType === 'customer' ? 1 : 0,
        },
      });

      await this.prisma.message.create({
        data: {
          wahaMessageId: msgId,
          conversationId: conversation.id,
          senderType: senderType,
          messageType: 'text',
          content: text,
          status: senderType === 'bot' ? 'SENT' : 'RECEIVED',
          metadata: { simulator: true },
        },
      });
    } catch (e: any) {
      this.logger.warn(`Failed to save simulator message to DB: ${e.message}`);
    }
  }

  @Get('history/:chatId')
  async getHistory(@Param('chatId') chatId: string) {
    try {
      const contact = await this.prisma.contact.findUnique({
        where: { phone: chatId },
      });
      if (!contact) return { messages: [] };

      const conversation = await this.prisma.conversation.findUnique({
        where: {
          instanceName_contactId: {
            instanceName: this.INSTANCE_NAME,
            contactId: contact.id,
          },
        },
      });
      if (!conversation) return { messages: [] };

      const messages = await this.prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        take: 50, // Limit to 50 latest messages
      });

      return {
        messages: messages.map((m) => ({
          id: m.id,
          sender: m.senderType === 'customer' ? 'user' : 'bot',
          text: m.content,
        })),
      };
    } catch (e: any) {
      this.logger.error(`Error fetching history: ${e.message}`);
      return { messages: [] };
    }
  }

  @Post()
  async chatSimulator(
    @Body()
    body: {
      message: string;
      simulateAs: 'customer' | 'owner';
      tenantId: string;
      chatId: string;
    },
    @Res() res: Response,
  ) {
    const { message, simulateAs, tenantId, chatId } = body;

    try {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Simpan pesan user
      await this.saveMessageToDb(
        chatId,
        simulateAs === 'owner' ? 'Owner (Sim)' : 'Customer (Sim)',
        message,
        'customer',
      );

      let realTenantId = tenantId;
      if (tenantId === 'demo' || tenantId.startsWith('t-')) {
        const firstOwner = await this.prisma.user.findFirst({
          where: { role: 'owner' },
        });
        if (firstOwner && firstOwner.tenantId) {
          realTenantId = firstOwner.tenantId;
        }
      }

      let fullBotResponse = '';
      const onChunk = (chunk: string) => {
        fullBotResponse += chunk;
        res.write(chunk);
      };

      if (simulateAs === 'owner') {
        await this.agentAssistantService.chatWithOwnerAssistant(
          message,
          realTenantId,
          chatId,
          onChunk,
        );
        await this.saveMessageToDb(
          chatId,
          'Asisten (Sim)',
          fullBotResponse,
          'bot',
        );
      } else {
        await this.csService.handleMessage(
          {
            senderId: chatId,
            text: message,
            provider: 'TELEGRAM',
            sessionName: this.INSTANCE_NAME,
            tenantId: realTenantId,
            replyCallback: async () => {}, // Mock
          },
          onChunk,
        );

        let textToSave = fullBotResponse;
        try {
          const parsed = JSON.parse(fullBotResponse);
          if (parsed.text) textToSave = parsed.text.replace(/[*~`]/g, '');

          if (parsed.order) {
            // Generate notification for owner in Simulator UI (Mock WAHA)
            const notifText = `🔥 *Pesanan Baru Masuk!*\n\nDari: ${parsed.order.customerName || 'Pelanggan Simulator'}\nItem: ${parsed.order.items || '-'}\nTotal: Rp${parsed.order.totalPrice || 0}\n\nKetik "proses pesanan ini" jika sudah siap.`;
            const ownerChatId = chatId.replace('-customer', '-owner');
            await this.saveMessageToDb(
              ownerChatId,
              'Bot Asisten',
              notifText,
              'bot',
            );

            // SalesRecord disimpan secara otomatis oleh CsService, jadi tidak perlu save manual di sini.
          }
        } catch (e) {
          // If parse fails, save raw
        }
        await this.saveMessageToDb(chatId, 'CS (Sim)', textToSave, 'bot');
      }
      res.end();
    } catch (e: any) {
      this.logger.error(`Simulator error: ${e.message}`, e.stack);
      // If headers are already sent, we just write to the stream.
      if (!res.headersSent) {
        res.status(500).json({ error: e.message });
      } else {
        res.write(`\n\n[ERROR]: ${e.message}`);
        res.end();
      }
    }
  }
}
