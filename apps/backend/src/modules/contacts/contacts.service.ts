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

  async listContacts(search?: string, status?: string) {
    const where: any = {};
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

    return this.prisma.contact.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        tags: { include: { tag: true } },
        conversations: {
          take: 1,
          orderBy: { lastMessageAt: 'desc' },
          include: {
            assignedTo: { select: { id: true, name: true } },
            messages: { take: 1, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });
  }

  async getContact(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        conversations: {
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

  async createContact(dto: CreateContactDto) {
    if (!dto.phone) throw new BadRequestException('Phone is required');
    const existing = await this.prisma.contact.findUnique({
      where: { phone: dto.phone },
    });
    if (existing)
      throw new BadRequestException('Nomor telepon sudah terdaftar');

    return this.prisma.contact.create({
      data: {
        name: dto.name || dto.phone,
        phone: dto.phone,
        email: dto.email,
        company: dto.company,
        address: dto.address,
        notes: dto.notes,
        status: dto.status || 'NEW',
        source: dto.source || 'MANUAL',
      },
    });
  }

  async updateContact(id: string, dto: UpdateContactDto) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Contact not found');

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
      },
    });
  }

  async deleteContact(id: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Contact not found');
    return this.prisma.contact.delete({ where: { id } });
  }
}
