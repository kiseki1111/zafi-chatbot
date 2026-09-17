import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { WahaService } from '../waha.service';
import { AgentSharedService } from '../../../core/agent-shared/agent-shared.service';

@Injectable()
export class FollowUpService {
  private readonly logger = new Logger(FollowUpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wahaService: WahaService,
    private readonly agentSharedService: AgentSharedService,
  ) {}

  async getConfig() {
    const config = await this.prisma.followUpConfig.findFirst();
    if (!config) {
      return {
        isEnabled: false,
        scheduleTime: '09:00',
        inactivityHours: 24,
        followUpPrompt: null,
      };
    }
    return config;
  }

  async updateConfig(
    data: Partial<{
      isEnabled: boolean;
      scheduleTime: string;
      inactivityHours: number;
      followUpPrompt: string;
    }>,
  ) {
    const existing = await this.prisma.followUpConfig.findFirst();
    if (existing) {
      return this.prisma.followUpConfig.update({
        where: { id: existing.id },
        data,
      });
    }
    const firstTenant = await this.prisma.tenant.findFirst();
    return this.prisma.followUpConfig.create({
      data: { ...data, tenantId: firstTenant?.id || '' },
    });
  }

  async getInactiveContacts(instanceName?: string) {
    const config = await this.getConfig();
    if (!config.isEnabled) {
      return [];
    }

    const inactivityMs = config.inactivityHours * 60 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - inactivityMs);

    const conversations = await this.prisma.conversation.findMany({
      where: {
        ...(instanceName ? { instanceName } : {}),
        lastMessageAt: { lt: cutoffTime },
        status: { not: 'CLOSED' },
      },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const contactIds = conversations.map((c) => c.contactId);
    if (contactIds.length === 0) return [];

    const followedUp = await this.prisma.followUp.findMany({
      where: {
        contactId: { in: contactIds },
        ...(instanceName ? { instanceName } : {}),
      },
      select: { contactId: true, instanceName: true },
    });

    const followedUpSet = new Set(
      followedUp.map((f) => `${f.contactId}:${f.instanceName}`),
    );

    return conversations
      .filter((c) => !followedUpSet.has(`${c.contactId}:${c.instanceName}`))
      .map((c) => ({
        contactId: c.contactId,
        contactName: c.contact?.name,
        contactPhone: c.contact?.phone,
        instanceName: c.instanceName,
        lastMessageAt: c.lastMessageAt,
      }));
  }

  async generateFollowUpMessage(
    contactPhone: string,
    instanceName: string,
    limit: number = 10,
  ): Promise<string | null> {
    const config = await this.getConfig();
    const defaultPrompt = `Anda adalah Customer Service yang ramah dan profesional. 
Tugas Anda: Buat pesan follow-up singkat (maks 2 kalimat) untuk pelanggan yang tidak merespons selama 24+ jam.
Konteks: Pelanggan terakhir berbicara tentang topik yang terlihat di 10 pesan terakhir di bawah.
Tujuan: Ingatkan pelanggan dengan natural, tanyakan apakah masih butuh bantuan, jangan pushy.
Bahasa: Indonesia. Maksimal 2 emoji. Tanpa markdown.`;

    const systemPrompt = config.followUpPrompt || defaultPrompt;

    const recentMessages = await this.agentSharedService.getRecentContext(
      contactPhone,
      instanceName,
      limit,
    );

    if (recentMessages.length === 0) {
      return 'Halo! Apakah masih ada yang bisa kami bantu? 😊';
    }

    const chatHistory = recentMessages
      .map((m) => `${m.senderType === 'bot' ? 'CS' : 'Customer'}: ${m.content}`)
      .join('\n');

    const userPrompt = `Riwayat chat 10 pesan terakhir:\n${chatHistory}\n\nBuat pesan follow-up singkat dan natural.`;

    try {
      const response = await this.agentSharedService.callLLM(
        userPrompt,
        systemPrompt,
        false,
      );
      return response.trim();
    } catch (e) {
      this.logger.error(
        `Failed to generate follow-up for ${contactPhone}: ${e.message}`,
      );
      return 'Halo! Apakah masih ada yang bisa kami bantu? 😊';
    }
  }

  async sendFollowUp(contactPhone: string, instanceName: string, text: string) {
    try {
      await this.wahaService.sendMessage(instanceName, contactPhone, text);
      const contact = await this.prisma.contact.findUnique({
        where: { phone: contactPhone },
      });
      if (!contact) {
        throw new Error(`Contact not found for phone: ${contactPhone}`);
      }
      await this.prisma.followUp.create({
        data: {
          contactId: contact.id,
          instanceName,
        },
      });
      this.logger.log(`Follow-up sent to ${contactPhone} on ${instanceName}`);
      return { success: true };
    } catch (e) {
      this.logger.error(
        `Failed to send follow-up to ${contactPhone}: ${e.message}`,
      );
      return { success: false, error: e.message };
    }
  }

  async processFollowUps(instanceName?: string) {
    const config = await this.getConfig();
    if (!config.isEnabled) {
      this.logger.log('Follow-up is disabled, skipping');
      return { processed: 0, sent: 0, errors: 0 };
    }

    const inactiveContacts = await this.getInactiveContacts(instanceName);
    this.logger.log(
      `Found ${inactiveContacts.length} inactive contacts for follow-up`,
    );
    this.logger.debug(
      `Inactive contacts: ${JSON.stringify(inactiveContacts.map((c) => c.contactPhone))}`,
    );

    let sent = 0;
    let errors = 0;

    for (const contact of inactiveContacts) {
      this.logger.log(
        `Processing follow-up for ${contact.contactPhone} on ${contact.instanceName}`,
      );
      const message = await this.generateFollowUpMessage(
        contact.contactPhone,
        contact.instanceName,
      );

      if (message) {
        this.logger.log(
          `Generated follow-up for ${contact.contactPhone}: "${message.substring(0, 50)}..."`,
        );
        const result = await this.sendFollowUp(
          contact.contactPhone,
          contact.instanceName,
          message,
        );
        if (result.success) {
          sent++;
        } else {
          errors++;
        }
      } else {
        this.logger.warn(`No message generated for ${contact.contactPhone}`);
        errors++;
      }
    }

    return { processed: inactiveContacts.length, sent, errors };
  }

  @Cron('0 9 * * *')
  async scheduledFollowUp() {
    this.logger.log('Starting scheduled follow-up at 9 AM');
    const result = await this.processFollowUps();
    this.logger.log(
      `Scheduled follow-up completed: ${result.sent} sent, ${result.errors} errors`,
    );
  }

  async getStats() {
    const totalFollowUps = await this.prisma.followUp.count();
    const inactiveContacts = await this.getInactiveContacts();
    return {
      totalFollowedUp: totalFollowUps,
      pendingCount: inactiveContacts.length,
      isEnabled: (await this.getConfig()).isEnabled,
    };
  }

  async getHistory(skip = 0, take = 50) {
    const [followUps, total] = await Promise.all([
      this.prisma.followUp.findMany({
        skip,
        take,
        orderBy: { followedUpAt: 'desc' },
        include: {
          contact: { select: { phone: true, name: true } },
        },
      }),
      this.prisma.followUp.count(),
    ]);

    return {
      data: followUps.map((f) => ({
        id: f.id,
        contactPhone: f.contact?.phone,
        contactName: f.contact?.name,
        instanceName: f.instanceName,
        followedUpAt: f.followedUpAt,
      })),
      total,
    };
  }

  async manualTrigger(instanceName?: string) {
    this.logger.log('Manual follow-up triggered');
    return this.processFollowUps(instanceName);
  }
}
