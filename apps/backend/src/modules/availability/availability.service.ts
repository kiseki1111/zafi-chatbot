import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getGroups(tenantId: string) {
    try {
      let filterWhere: any = {};
      if (tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
        });
        if (tenant) {
          filterWhere = { tenantId: tenant.id };
        }
      }

      return await this.prisma.resourceGroup.findMany({
        where: filterWhere,
        include: {
          items: {
            orderBy: { code: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      console.error('Error getGroups in AvailabilityService:', error);
      return [];
    }
  }

  async createGroup(
    tenantId: string,
    data: {
      name: string;
      category?: string;
      description?: string;
      siteplanImage?: string;
    },
  ) {
    try {
      let validTenantId: string | null = null;
      if (tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
        });
        if (tenant) {
          validTenantId = tenant.id;
        }
      }

      return await this.prisma.resourceGroup.create({
        data: {
          tenantId: validTenantId,
          name: data.name,
          category: data.category || 'properti',
          description: data.description || null,
          siteplanImage: data.siteplanImage || null,
        },
        include: { items: true },
      });
    } catch (error: any) {
      console.error('Error createGroup in AvailabilityService:', error);
      throw error;
    }
  }

  async updateGroup(
    id: string,
    data: {
      name?: string;
      category?: string;
      description?: string;
      siteplanImage?: string;
    },
  ) {
    return this.prisma.resourceGroup.update({
      where: { id },
      data,
      include: { items: true },
    });
  }

  async deleteGroup(id: string) {
    return this.prisma.resourceGroup.delete({
      where: { id },
    });
  }

  async addItem(
    groupId: string,
    data: {
      code: string;
      name?: string;
      houseType?: string;
      status?: string;
      price?: number;
      capacity?: number;
      notes?: string;
      customerName?: string;
      customerPhone?: string;
    },
  ) {
    return this.prisma.resourceItem.create({
      data: {
        groupId,
        code: data.code,
        name: data.name,
        houseType: data.houseType,
        status: data.status || 'AVAILABLE',
        price: data.price,
        capacity: data.capacity || 1,
        notes: data.notes,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
      },
    });
  }

  async addBatchItems(
    groupId: string,
    prefix: string,
    startNumber: number,
    endNumber: number,
    houseType?: string,
    price?: number,
  ) {
    const itemsData: any[] = [];
    for (let i = startNumber; i <= endNumber; i++) {
      const code = `${prefix}${i < 10 ? '0' + i : i}`;
      itemsData.push({
        groupId,
        code,
        houseType: houseType || null,
        status: 'AVAILABLE',
        price: price || null,
        capacity: 1,
      });
    }

    return this.prisma.resourceItem.createMany({
      data: itemsData,
      skipDuplicates: true,
    });
  }

  async updateItem(
    id: string,
    data: {
      code?: string;
      name?: string;
      houseType?: string;
      status?: string;
      price?: number;
      capacity?: number;
      notes?: string;
      customerName?: string;
      customerPhone?: string;
    },
  ) {
    return this.prisma.resourceItem.update({
      where: { id },
      data,
    });
  }

  async deleteItem(id: string) {
    return this.prisma.resourceItem.delete({
      where: { id },
    });
  }
}
