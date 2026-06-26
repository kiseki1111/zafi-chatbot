import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PermissionsRepository } from '../repositories/permissions.repository';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  async create(createPermissionDto: CreatePermissionDto) {
    try {
      return await this.permissionsRepository.create(createPermissionDto);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(`Permission dengan resource dan action ini sudah ada, atau nama permission sudah digunakan.`);
        }
      }
      throw error;
    }
  }

  async findAll() {
    return this.permissionsRepository.findAll();
  }

  async findOne(id: string) {
    const permission = await this.permissionsRepository.findById(id);
    if (!permission) {
      throw new NotFoundException(`Permission dengan ID ${id} tidak ditemukan`);
    }
    return permission;
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto) {
    await this.findOne(id); // Ensure exists
    try {
      return await this.permissionsRepository.update(id, updatePermissionDto);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(`Permission dengan resource dan action ini sudah ada, atau nama permission sudah digunakan.`);
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure exists
    return this.permissionsRepository.delete(id);
  }
}
