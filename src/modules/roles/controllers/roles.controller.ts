import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { RolesService } from '../services/roles.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';

@Controller('api/v1/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Mengunci rute dengan sistem pengaman berlapis
export class RolesController {
    // Menyuntikkan layanan bisnis peran
    constructor(private readonly rolesService: RolesService) { }

    @Get()
    @Permissions('role:read') // Hanya user dengan izin role:read yang bisa melihat list peran
    async findAll() {
        return this.rolesService.getAllRoles();
    }

    @Get(':id')
    @Permissions('role:read')
    async findOne(@Param('id') id: string) {
        return this.rolesService.getRoleById(id);
    }

    @Post()
    @Permissions('role:create') // Mengunci izin pembuatan peran baru
    async create(@Body() createRoleDto: CreateRoleDto) {
        return this.rolesService.createRole(createRoleDto);
    }

    @Patch(':id')
    @Permissions('role:update')
    async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
        return this.rolesService.updateRole(id, updateRoleDto);
    }

    @Delete(':id')
    @Permissions('role:delete')
    async remove(@Param('id') id: string) {
        return this.rolesService.deleteRole(id);
    }
}