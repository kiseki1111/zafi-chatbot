import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async listContacts(
    search?: string,
    status?: string,
    tenantId?: string,
    isSuper?: boolean,
  ) {
    // ponytail: fail-closed if tenantId is missing for non-superadmin
    if (!tenantId && !isSuper) {
      return [];
    }

    const where: any = {
      phone: { not: { contains: 'broadcast' } },
    };

    if (tenantId) {
      where.AND = [
        {
          OR: [
            { tenantId },
            {
              tenantId: null,
              conversations: {
                some: {
                  whatsappInstance: {
                    tenantId,
                  },
                },
              },
            },
          ],
        },
      ];
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    const contacts = await this.prisma.contact.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        tags: { include: { tag: true } },
        conversations: {
          where: tenantId ? { whatsappInstance: { tenantId } } : undefined,
          take: 1,
          orderBy: { lastMessageAt: 'desc' },
          include: {
            assignedTo: { select: { id: true, name: true } },
            messages: { take: 5, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });

    const mapped = contacts.map((c) => {
      let realPhone = c.phone;
      const msgs = c.conversations?.[0]?.messages || [];
      for (const msg of msgs) {
        const meta = msg.metadata as any;
        const alt =
          meta?._data?.key?.remoteJidAlt ||
          meta?._data?.remoteJidAlt ||
          meta?._data?.senderAlt ||
          meta?._data?.key?.participant;
        if (alt && !alt.includes('@lid')) {
          realPhone = alt;
          break;
        }
      }

      const cleanPhone = (realPhone || '')
        .replace(/@(c\.us|s\.whatsapp\.net|lid|broadcast)$/i, '')
        .replace(/^\+/, '');

      let displayName = c.name;
      if (
        !displayName ||
        displayName.includes('@') ||
        displayName === c.phone ||
        displayName === cleanPhone ||
        displayName.startsWith('+')
      ) {
        for (const msg of msgs) {
          const meta = msg.metadata as any;
          const notify = meta?._data?.notifyName || meta?.sender?.pushname;
          if (notify && typeof notify === 'string') {
            displayName = notify;
            break;
          }
        }
        if (
          !displayName ||
          displayName === c.phone ||
          displayName.startsWith('+')
        ) {
          displayName = 'Anonim';
        }
      }

      return {
        ...c,
        name: displayName,
        phone: cleanPhone,
        firstChatAt: c.createdAt,
        lastChatAt: c.conversations?.[0]?.lastMessageAt || c.updatedAt,
      };
    });

    // ponytail: deduplicate contacts by phone; keep richer CRM record over empty duplicate
    const seen = new Map<string, (typeof mapped)[0]>();
    for (const item of mapped) {
      const existing = seen.get(item.phone);
      if (!existing) {
        seen.set(item.phone, item);
      } else {
        const itemScore =
          (item.status !== 'NEW' ? 2 : 0) +
          (item.notes ? 2 : 0) +
          (item.conversations?.length ? 1 : 0);
        const existingScore =
          (existing.status !== 'NEW' ? 2 : 0) +
          (existing.notes ? 2 : 0) +
          (existing.conversations?.length ? 1 : 0);
        if (itemScore > existingScore) {
          seen.set(item.phone, item);
        }
      }
    }
    return Array.from(seen.values());
  }

  async getContact(id: string, tenantId?: string) {
    const where: any = { id };
    if (tenantId) {
      where.AND = [
        {
          OR: [
            { tenantId },
            {
              tenantId: null,
              conversations: {
                some: {
                  whatsappInstance: {
                    tenantId,
                  },
                },
              },
            },
          ],
        },
      ];
    }

    const contact = await this.prisma.contact.findFirst({
      where,
      include: {
        tags: { include: { tag: true } },
        conversations: {
          where: tenantId ? { whatsappInstance: { tenantId } } : undefined,
          orderBy: { lastMessageAt: 'desc' },
          include: {
            assignedTo: { select: { id: true, name: true } },
            messages: { take: 5, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async createContact(dto: CreateContactDto, tenantId?: string) {
    if (!dto.phone) throw new BadRequestException('Phone is required');
    const existing = await this.prisma.contact.findFirst({
      where: {
        phone: dto.phone,
        ...(tenantId ? { tenantId } : {}),
      },
    });
    if (existing)
      throw new BadRequestException('Nomor telepon sudah terdaftar');

    const contact = await this.prisma.contact.create({
      data: {
        tenantId: tenantId || null,
        name: dto.name || dto.phone,
        phone: dto.phone,
        email: dto.email,
        company: dto.company,
        address: dto.address,
        notes: dto.notes,
        status: dto.status || 'NEW',
        source: dto.source || 'MANUAL',
        metadata: dto.metadata || {},
      },
    });

    if (tenantId) {
      const instance = await this.prisma.whatsappInstance.findFirst({
        where: { tenantId },
      });
      if (instance) {
        await this.prisma.conversation
          .create({
            data: {
              contactId: contact.id,
              instanceName: instance.instanceName,
              status: 'OPEN',
            },
          })
          .catch(() => null);
      }
    }

    return contact;
  }

  async updateContact(id: string, dto: UpdateContactDto, tenantId?: string) {
    const where: any = { id };
    if (tenantId) {
      where.AND = [
        {
          OR: [
            { tenantId },
            {
              tenantId: null,
              conversations: {
                some: {
                  whatsappInstance: {
                    tenantId,
                  },
                },
              },
            },
          ],
        },
      ];
    }
    const contact = await this.prisma.contact.findFirst({ where });
    if (!contact) throw new NotFoundException('Contact not found');

    const currentMeta = (contact.metadata as Record<string, any>) || {};
    const updatedMeta =
      dto.metadata !== undefined
        ? { ...currentMeta, ...dto.metadata }
        : { ...currentMeta };
    if (
      (dto.status !== undefined && dto.status !== contact.status) ||
      (dto.notes !== undefined &&
        dto.notes.trim() !== (contact.notes || '').trim())
    ) {
      const logs = Array.isArray(updatedMeta.statusLogs)
        ? [...updatedMeta.statusLogs]
        : [];
      const newStatus = dto.status !== undefined ? dto.status : contact.status;
      const newNotes =
        dto.notes !== undefined ? dto.notes : contact.notes || '';
      logs.push({
        status: newStatus,
        notes: newNotes,
        timestamp: new Date().toISOString(),
      });
      updatedMeta.statusLogs = logs;
    }

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.company !== undefined && { company: dto.company }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status !== undefined && { status: dto.status }),
        metadata: updatedMeta,
      },
    });
  }

  async deleteContact(id: string, tenantId?: string) {
    const where: any = { id };
    if (tenantId) {
      where.AND = [
        {
          OR: [
            { tenantId },
            {
              tenantId: null,
              conversations: {
                some: {
                  whatsappInstance: {
                    tenantId,
                  },
                },
              },
            },
          ],
        },
      ];
    }
    const contact = await this.prisma.contact.findFirst({ where });
    if (!contact) throw new NotFoundException('Contact not found');
    return this.prisma.contact.delete({ where: { id } });
  }
}
