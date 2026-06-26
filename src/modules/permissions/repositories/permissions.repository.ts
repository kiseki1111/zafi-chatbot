import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma, Permission } from '@prisma/client';

@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.PermissionCreateInput): Promise<Permission> {
    return this.prisma.permission.create({
      data,
    });
  }

  async findAll(): Promise<Permission[]> {
    return this.prisma.permission.findMany();
  }

  async findById(id: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: Prisma.PermissionUpdateInput): Promise<Permission> {
    return this.prisma.permission.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Permission> {
    return this.prisma.permission.delete({
      where: { id },
    });
  }
}
