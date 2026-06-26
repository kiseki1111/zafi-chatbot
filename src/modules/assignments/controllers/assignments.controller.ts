import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AssignmentsService } from '../services/assignments.service';
import { AssignUserRoleDto } from '../dto/assign-user-role.dto';
import { AssignRolePermissionDto } from '../dto/assign-role-permission.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';

@Controller('api/v1')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post('user-roles')
  @Permissions('assignment:create')
  assignUserRole(@Body() assignUserRoleDto: AssignUserRoleDto) {
    return this.assignmentsService.assignUserToRole(assignUserRoleDto);
  }

  @Post('role-permissions')
  @Permissions('assignment:create')
  assignRolePermission(@Body() assignRolePermissionDto: AssignRolePermissionDto) {
    return this.assignmentsService.assignRoleToPermission(assignRolePermissionDto);
  }
}
