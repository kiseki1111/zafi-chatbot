import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class ListingService {
  private readonly logger = new Logger(ListingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProjects() {
    return this.prisma.project.findMany({
      include: {
        units: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getUnits() {
    return this.prisma.unit.findMany({
      include: {
        project: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
