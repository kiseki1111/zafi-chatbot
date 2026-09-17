import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WahaService } from '../waha/waha.service';

@Injectable()
export class ChatsService {
  private readonly logger = new Logger(ChatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wahaService: WahaService,
  ) {}

  async getConversations(instanceName?: string) {
    const where =
      instanceName && instanceName !== 'all' ? { instanceName } : {};
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

    return conversations.map((c) => {
      let realPhone = c.contact?.phone;
      if (
        realPhone &&
        realPhone.endsWith('@lid') &&
        c.messages &&
        c.messages.length > 0
      ) {
        const msg = c.messages[0];
        const meta = msg.metadata as any;
        if (meta?._data?.key?.remoteJidAlt) {
          realPhone = meta._data.key.remoteJidAlt;
        }
      }
      return {
        ...c,
        contactName: c.contact?.name,
        contactNumber: realPhone,
      };
    });
  }

  async getMessages(
    conversationId: string,
    skip: number = 0,
    take: number = 20,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
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

  // Admin takeover: set mode=human, assign agent
  async takeoverConversation(conversationId: string, agentId?: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    let validAgentId: string | null = null;
    if (agentId) {
      const user = await this.prisma.user.findUnique({
        where: { id: agentId },
      });
      if (user) validAgentId = user.id;
    }
    if (!validAgentId) {
      const defaultAdmin = await this.prisma.user.findFirst({
        where: { role: { in: ['administrator', 'manager', 'owner', 'ADMIN'] } },
      });
      validAgentId = defaultAdmin?.id || null;
    }

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        mode: 'human',
        ...(validAgentId ? { assignedToId: validAgentId } : {}),
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    if (validAgentId) {
      await this.prisma.conversationAssignment
        .create({
          data: { conversationId, agentId: validAgentId },
        })
        .catch((e) =>
          this.logger.debug(`Assignment already exists or error: ${e.message}`),
        );
    }

    return updated;
  }

  // Release conversation back to bot
  async releaseConversation(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { mode: 'bot', assignedToId: null },
    });
  }

  // Admin send text message
  async sendMessage(
    conversationId: string,
    agentId: string | undefined,
    text: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const chatId = conversation.contact.phone;
    const instanceName = conversation.instanceName;

    let validAgentId: string | null = null;
    if (agentId) {
      const user = await this.prisma.user.findUnique({
        where: { id: agentId },
      });
      if (user) validAgentId = user.id;
    }

    // Save to DB
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderType: 'agent',
        ...(validAgentId ? { senderId: validAgentId } : {}),
        messageType: 'text',
        content: text,
        status: 'SENT',
      },
    });

    // Try sending via WAHA (fails gracefully in dev/mock)
    try {
      await this.wahaService.sendMessage(instanceName, chatId, text);
    } catch (e) {
      this.logger.warn(`WAHA kirim gagal (Mode Offline/Mock): ${e.message}`);
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });
    return message;
  }

  // Admin send image from URL (already hosted image)
  async sendImageUrl(
    conversationId: string,
    agentId: string | undefined,
    imageUrl: string,
    caption?: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const chatId = conversation.contact.phone;
    const instanceName = conversation.instanceName;

    let validAgentId: string | null = null;
    if (agentId) {
      const user = await this.prisma.user.findUnique({
        where: { id: agentId },
      });
      if (user) validAgentId = user.id;
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderType: 'agent',
        ...(validAgentId ? { senderId: validAgentId } : {}),
        messageType: 'image',
        content: caption || '',
        metadata: { mediaUrl: imageUrl },
        status: 'SENT',
      },
    });

    try {
      await this.wahaService.sendImage(instanceName, chatId, imageUrl, caption);
    } catch (e) {
      this.logger.warn(
        `WAHA sendImage gagal (Mode Offline/Mock): ${e.message}`,
      );
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });
    return message;
  }

  // Admin send image from base64 upload
  async sendImageBase64(
    conversationId: string,
    agentId: string | undefined,
    base64: string,
    mimeType: string,
    caption?: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const chatId = conversation.contact.phone;
    const instanceName = conversation.instanceName;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    let validAgentId: string | null = null;
    if (agentId) {
      const user = await this.prisma.user.findUnique({
        where: { id: agentId },
      });
      if (user) validAgentId = user.id;
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderType: 'agent',
        ...(validAgentId ? { senderId: validAgentId } : {}),
        messageType: 'image',
        content: caption || '',
        metadata: { mediaUrl: dataUrl },
        status: 'SENT',
      },
    });

    // Coba kirim via WAHA
    try {
      const { default: axios } = await import('axios');
      const wahaUrl = process.env.WAHA_API_URL || 'http://103.30.195.145:3060';
      const apiKey = process.env.WAHA_API_KEY || 'ZafitechDunia12345#';

      await axios.post(
        `${wahaUrl}/api/sendImage`,
        {
          session: instanceName,
          chatId,
          file: { mimetype: mimeType, filename: 'image.jpg', data: base64 },
          ...(caption ? { caption } : {}),
        },
        { headers: { 'X-Api-Key': apiKey } },
      );
    } catch (e) {
      this.logger.warn(
        `WAHA sendImage base64 gagal (Mode Offline/Mock): ${e.message}`,
      );
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });
    return message;
  }

  // Simulation: Mock incoming customer message (text or image)
  async mockIncomingMessage(dto: {
    phone: string;
    name?: string;
    text?: string;
    imageUrl?: string;
    instanceName?: string;
  }) {
    const instanceName = dto.instanceName || 'dev-session';
    const phone = dto.phone;
    const name = dto.name || `Pelanggan ${phone.slice(-4)}`;

    // 1. Pastikan instance ada di DB
    await this.prisma.whatsappInstance.upsert({
      where: { instanceName },
      update: { status: 'WORKING' },
      create: {
        instanceName,
        status: 'WORKING',
        profileName: 'Simulasi Bot WA',
      },
    });

    // 2. Upsert Contact
    const contact = await this.prisma.contact.upsert({
      where: { phone },
      update: { name },
      create: { phone, name, status: 'NEW', source: 'WHATSAPP' },
    });

    // 3. Upsert Conversation
    const conversation = await this.prisma.conversation.upsert({
      where: {
        instanceName_contactId: {
          instanceName,
          contactId: contact.id,
        },
      },
      update: {
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      },
      create: {
        instanceName,
        contactId: contact.id,
        status: 'OPEN',
        mode: 'bot',
        unreadCount: 1,
      },
    });

    // 4. Create Incoming Message
    const isImage = !!dto.imageUrl;
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: 'customer',
        messageType: isImage ? 'image' : 'text',
        content: dto.text || (isImage ? 'Mengirim foto' : ''),
        metadata: isImage ? { mediaUrl: dto.imageUrl } : undefined,
        status: 'RECEIVED',
      },
    });

    return { success: true, conversation, message };
  }

  // Real WAHA Test: Kirim text/image langsung ke WAHA API dan verifikasi responnya
  async testRealWahaSend(dto: {
    sessionName: string;
    chatId: string;
    text?: string;
    imageUrl?: string;
    base64?: string;
    mimeType?: string;
  }) {
    const { default: axios } = await import('axios');
    const wahaUrl = process.env.WAHA_API_URL || 'http://103.30.195.145:3060';
    const apiKey = (process.env.WAHA_API_KEY || 'ZafitechDunia12345#').replace(
      /"/g,
      '',
    );
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    };

    let targetChatId = dto.chatId;
    if (!targetChatId.includes('@')) {
      targetChatId = `${targetChatId}@c.us`;
    }

    const testResult: any = {
      wahaUrl,
      sessionName: dto.sessionName,
      targetChatId,
      timestamp: new Date().toISOString(),
      wahaSessionStatus: 'unknown',
      sendSuccess: false,
      response: null,
      error: null,
    };

    // 1. Cek status sesi di WAHA
    try {
      const sessionRes = await axios.get(
        `${wahaUrl}/api/sessions/${dto.sessionName}`,
        { headers },
      );
      testResult.wahaSessionStatus = sessionRes.data?.status || 'OK';
    } catch (e: any) {
      testResult.wahaSessionStatus = e.response?.data?.message || e.message;
    }

    // 2. Kirim pesan / gambar
    try {
      if (dto.base64 && dto.mimeType) {
        // Kirim Image Base64
        const res = await axios.post(
          `${wahaUrl}/api/sendImage`,
          {
            session: dto.sessionName,
            chatId: targetChatId,
            file: {
              mimetype: dto.mimeType,
              filename: 'test-image.jpg',
              data: dto.base64,
            },
            caption: dto.text || undefined,
          },
          { headers },
        );
        testResult.sendSuccess = true;
        testResult.response = res.data;
      } else if (dto.imageUrl) {
        // Download image lalu kirim Base64
        const imgRes = await axios.get(dto.imageUrl, {
          responseType: 'arraybuffer',
        });
        const base64Data = Buffer.from(imgRes.data).toString('base64');
        const mime = String(imgRes.headers['content-type'] || 'image/jpeg');

        const res = await axios.post(
          `${wahaUrl}/api/sendImage`,
          {
            session: dto.sessionName,
            chatId: targetChatId,
            file: {
              mimetype: mime.includes('text/html') ? 'image/jpeg' : mime,
              filename: 'test-image.jpg',
              data: base64Data,
            },
            caption: dto.text || undefined,
          },
          { headers },
        );
        testResult.sendSuccess = true;
        testResult.response = res.data;
      } else if (dto.text) {
        // Kirim Text
        const res = await axios.post(
          `${wahaUrl}/api/sendText`,
          {
            session: dto.sessionName,
            chatId: targetChatId,
            text: dto.text,
          },
          { headers },
        );
        testResult.sendSuccess = true;
        testResult.response = res.data;
      } else {
        throw new BadRequestException('Harus menyertakan text atau gambar');
      }
    } catch (e: any) {
      testResult.sendSuccess = false;
      testResult.error = e.response?.data || e.message;
    }

    return testResult;
  }
}
