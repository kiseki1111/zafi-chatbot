import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface SearchResultItem {
  id: string;
  category: 'contact' | 'message' | 'knowledge' | 'unit' | 'product';
  title: string;
  subtitle?: string;
  meta?: Record<string, any>;
  highlight?: string;
}

export interface SearchCategoryResult {
  category: SearchResultItem['category'];
  items: SearchResultItem[];
  totalMs: number;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  private truncate(text: string, maxLen = 120): string {
    if (!text) return '';
    return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
  }

  private highlight(text: string, q: string): string {
    if (!text || !q) return text;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '**$1**');
  }

  async searchContacts(
    q: string,
    tenantId: string | null,
    isSuperadmin: boolean,
    limit = 6,
  ): Promise<SearchCategoryResult> {
    const t0 = Date.now();
    const where: any = {
      phone: { not: { contains: 'broadcast' } },
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ],
    };

    if (!isSuperadmin && tenantId) {
      where.conversations = {
        some: { whatsappInstance: { tenantId } },
      };
    }

    const rows = await this.prisma.contact.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        company: true,
        conversations: {
          take: 1,
          orderBy: { lastMessageAt: 'desc' },
          select: { id: true, instanceName: true, lastMessageAt: true },
        },
      },
    });

    const items: SearchResultItem[] = rows.map((r) => ({
      id: r.id,
      category: 'contact',
      title: r.name || r.phone,
      subtitle: r.phone + (r.company ? ` · ${r.company}` : ''),
      meta: {
        status: r.status,
        conversationId: r.conversations[0]?.id,
        instanceName: r.conversations[0]?.instanceName,
      },
      highlight: this.highlight(r.name || r.phone, q),
    }));

    return { category: 'contact', items, totalMs: Date.now() - t0 };
  }

  async searchMessages(
    q: string,
    tenantId: string | null,
    isSuperadmin: boolean,
    limit = 5,
  ): Promise<SearchCategoryResult> {
    const t0 = Date.now();
    const where: any = {
      content: { contains: q, mode: 'insensitive' },
      senderType: { in: ['customer', 'bot', 'agent'] },
    };

    if (!isSuperadmin && tenantId) {
      where.conversation = {
        whatsappInstance: { tenantId },
        contact: { phone: { not: { contains: 'broadcast' } } },
      };
    }

    const rows = await this.prisma.message.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        senderType: true,
        createdAt: true,
        conversation: {
          select: {
            id: true,
            instanceName: true,
            contact: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    });

    const items: SearchResultItem[] = rows.map((r) => ({
      id: r.id,
      category: 'message',
      title: this.truncate(r.content, 80),
      subtitle:
        (r.conversation.contact?.name || r.conversation.contact?.phone || '-') +
        ' · ' +
        new Date(r.createdAt).toLocaleDateString('id-ID'),
      meta: {
        conversationId: r.conversation.id,
        instanceName: r.conversation.instanceName,
        contactId: r.conversation.contact?.id,
        senderType: r.senderType,
      },
      highlight: this.highlight(this.truncate(r.content, 80), q),
    }));

    return { category: 'message', items, totalMs: Date.now() - t0 };
  }

  async searchKnowledge(
    q: string,
    tenantId: string | null,
    isSuperadmin: boolean,
    limit = 5,
  ): Promise<SearchCategoryResult> {
    const t0 = Date.now();
    const where: any = {
      OR: [{ content: { contains: q, mode: 'insensitive' } }],
    };
    if (!isSuperadmin && tenantId) where.tenantId = tenantId;

    const rows = await this.prisma.knowledgeBase.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, content: true, metadata: true, createdAt: true },
    });

    const items: SearchResultItem[] = rows.map((r) => {
      const meta = r.metadata as any;
      const title = meta?.title || this.truncate(r.content, 60);
      const snippet = this.truncate(r.content, 100);
      return {
        id: r.id,
        category: 'knowledge',
        title,
        subtitle: new Date(r.createdAt).toLocaleDateString('id-ID'),
        meta: { type: meta?.type },
        highlight: this.highlight(snippet, q),
      };
    });

    return { category: 'knowledge', items, totalMs: Date.now() - t0 };
  }

  async searchUnits(
    q: string,
    tenantId: string | null,
    isSuperadmin: boolean,
    limit = 6,
  ): Promise<SearchCategoryResult> {
    const t0 = Date.now();
    const where: any = {
      OR: [
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { propertyType: { contains: q, mode: 'insensitive' } },
        { houseType: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ],
    };
    if (!isSuperadmin && tenantId) {
      where.group = { tenantId };
    }

    const rows = await this.prisma.resourceItem.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        code: true,
        name: true,
        propertyType: true,
        houseType: true,
        status: true,
        price: true,
        group: { select: { id: true, name: true, tenantId: true } },
      },
    });

    const items: SearchResultItem[] = rows.map((r) => ({
      id: r.id,
      category: 'unit',
      title: `${r.code}${r.houseType ? ` (${r.houseType})` : ''}`,
      subtitle:
        r.group.name +
        (r.price ? ` · Rp ${Number(r.price).toLocaleString('id-ID')}` : ''),
      meta: {
        status: r.status,
        groupId: r.group.id,
        groupName: r.group.name,
      },
      highlight: this.highlight(r.code, q),
    }));

    return { category: 'unit', items, totalMs: Date.now() - t0 };
  }

  async searchProducts(
    q: string,
    tenantId: string | null,
    isSuperadmin: boolean,
    limit = 5,
  ): Promise<SearchCategoryResult> {
    const t0 = Date.now();
    const where: any = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    };
    if (!isSuperadmin && tenantId) where.tenantId = tenantId;

    const rows = await this.prisma.product.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        stock: true,
      },
    });

    const items: SearchResultItem[] = rows.map((r) => ({
      id: r.id,
      category: 'product',
      title: r.name,
      subtitle:
        r.category +
        ` · Rp ${Number(r.price).toLocaleString('id-ID')}` +
        ` · Stok: ${r.stock}`,
      meta: { stock: r.stock, price: Number(r.price) },
      highlight: this.highlight(r.name, q),
    }));

    return { category: 'product', items, totalMs: Date.now() - t0 };
  }

  /**
   * Semua kategori secara paralel - dipakai endpoint REST biasa.
   * Setiap kategori dikembalikan setelah selesai, frontend tetap bisa
   * render parsial via Promise.allSettled.
   */
  async searchAll(
    q: string,
    tenantId: string | null,
    isSuperadmin: boolean,
  ): Promise<SearchCategoryResult[]> {
    const [contacts, units, knowledge, products, messages] =
      await Promise.allSettled([
        this.searchContacts(q, tenantId, isSuperadmin),
        this.searchUnits(q, tenantId, isSuperadmin),
        this.searchKnowledge(q, tenantId, isSuperadmin),
        this.searchProducts(q, tenantId, isSuperadmin),
        this.searchMessages(q, tenantId, isSuperadmin),
      ]);

    return [contacts, units, knowledge, products, messages]
      .filter(
        (r): r is PromiseFulfilledResult<SearchCategoryResult> =>
          r.status === 'fulfilled',
      )
      .map((r) => r.value);
  }
}
