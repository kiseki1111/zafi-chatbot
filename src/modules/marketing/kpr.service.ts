import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class KprService {
  private readonly logger = new Logger(KprService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getKprSubmissions() {
    return this.prisma.kprSubmission.findMany({
      include: {
        booking: {
          include: {
            contact: true,
            unit: {
              include: {
                project: true
              }
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });
  }

  async updateKprStatus(id: string, status: string) {
    return this.prisma.kprSubmission.update({
      where: { id },
      data: { status }
    });
  }
}
