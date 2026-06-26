import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleDto } from './create-role.dto';

// DTO untuk memvalidasi perubahan data peran secara opsional
export class UpdateRoleDto extends PartialType(CreateRoleDto) { }