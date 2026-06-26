import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AssignUserRoleDto } from '../dto/assign-user-role.dto';
import { AssignRolePermissionDto } from '../dto/assign-role-permission.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async assignUserToRole(dto: AssignUserRoleDto) {
    const { userId, roleId } = dto;

    // Pastikan User dan Role ada
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role tidak ditemukan');

    // Cek apakah relasi sudah ada (idempotent)
    const existing = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    if (existing) {
      return { message: 'User sudah memiliki Role ini', data: existing };
    }

    // Buat relasi baru
    const userRole = await this.prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
    });

    return { message: 'Role berhasil ditugaskan ke User', data: userRole };
  }

  async assignRoleToPermission(dto: AssignRolePermissionDto) {
    const { roleId, permissionId } = dto;

    // Pastikan Role dan Permission ada
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role tidak ditemukan');

    const permission = await this.prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) throw new NotFoundException('Permission tidak ditemukan');

    // Cek apakah relasi sudah ada (idempotent)
    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    if (existing) {
      return { message: 'Role sudah memiliki Permission ini', data: existing };
    }

    // Buat relasi baru
    const rolePermission = await this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });

    return { message: 'Permission berhasil ditugaskan ke Role', data: rolePermission };
  }
}
