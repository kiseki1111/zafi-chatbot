import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

// Ponytail: Satu model generik key-value PlatformConfig untuk pricing & ai_config.
// Upgrade ke model terpisah kalau butuh query relasional / audit per-field.
@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(key: string) {
    const row = await this.prisma.platformConfig
      .findUnique({ where: { key } })
      .catch(() => null);
    return row?.value ?? null;
  }

  async setConfig(key: string, value: any) {
    return this.prisma.platformConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async getStats() {
    const [tenants, instances, instancesDb, webhookLogs, messages, contacts] =
      await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.whatsappInstance.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
        this.prisma.whatsappInstance.count(),
        this.prisma.webhookLog.count(),
        this.prisma.message.count(),
        this.prisma.contact.count(),
      ]);

    // MAU & AI-response per tenant: jumlah message + aiSession pakai
    const aiMessages = await this.prisma.aiMessage.count().catch(() => 0);

    return {
      totalClients: tenants,
      totalInstances: instancesDb,
      activeInstances: instances
        .filter((i) => i.status === 'WORKING' || i.status === 'CONNECTED')
        .reduce((acc, i) => acc + i._count.status, 0),
      totalMessages: messages,
      totalContacts: contacts,
      totalWebhookLogs: webhookLogs,
      totalAiMessages: aiMessages,
      instancesByStatus: instances,
    };
  }

  async getQuotaOverview() {
    // Semua klien + berapa sisa kuota MAU/AI
    const tenants = await this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        metadata: true,
        _count: { select: { whatsappInstances: true } },
      },
    });

    return Promise.all(
      tenants.map(async (t) => {
        const meta = (t.metadata as any) || {};
        const maxMau = meta.maxMau ?? 0;
        const maxAi = meta.maxAiResponses ?? 0;

        // MAU ~= jumlah kontak unik yang pernah berchat pada instance milik tenant ini
        const mauUsed = await this.prisma.contact
          .count({
            where: {
              conversations: {
                some: {
                  whatsappInstance: { tenantId: t.id },
                },
              },
            },
          })
          .catch(() => 0);

        // AI response ~= jumlah message dari bot pada chat tenant ini
        const aiUsed = await this.prisma.message
          .count({
            where: {
              senderType: 'bot',
              conversation: {
                whatsappInstance: { tenantId: t.id },
              },
            },
          })
          .catch(() => 0);

        return {
          id: t.id,
          name: t.name,
          plan: meta.plan ?? 'trial',
          maxMau,
          maxAiResponses: maxAi,
          mauUsed,
          aiUsed,
          mauPercent: maxMau ? Math.round((mauUsed / maxMau) * 100) : 0,
          aiPercent: maxAi ? Math.round((aiUsed / maxAi) * 100) : 0,
          instances: t._count.whatsappInstances,
        };
      }),
    );
  }

  async webhookLogs(limit = 200) {
    return this.prisma.webhookLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}