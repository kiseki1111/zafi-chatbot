import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSalesPerformance() {
    // Get all users with operator/sales roles
    const agents = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: 'operator'
            }
          }
        }
      },
      include: {
        bookings: true
      }
    });

    return agents.map(agent => {
      const completed = agent.bookings.filter(b => b.status === 'COMPLETED').length;
      const total = agent.bookings.length;
      const revenue = agent.bookings
        .filter(b => b.status === 'COMPLETED' || b.status === 'PARTIAL')
        .reduce((sum, b) => sum + Number(b.paidDp), 0);
        
      return {
        id: agent.id,
        name: agent.name || 'Unknown',
        email: agent.email,
        totalBookings: total,
        completedBookings: completed,
        conversionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        revenue
      };
    });
  }
}
