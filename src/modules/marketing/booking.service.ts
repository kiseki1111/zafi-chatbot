import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBookings() {
    return this.prisma.booking.findMany({
      include: {
        contact: true,
        unit: {
          include: {
            project: true
          }
        },
        agent: true
      },
      orderBy: { bookingDate: 'desc' }
    });
  }

  async createBooking(data: any) {
    return this.prisma.booking.create({
      data: {
        bookingCode: `BK-${Date.now()}`,
        contactId: data.contactId,
        unitId: data.unitId,
        agentId: data.agentId,
        totalDp: data.totalDp,
        paidDp: data.paidDp,
        status: data.status,
      }
    });
  }
}
