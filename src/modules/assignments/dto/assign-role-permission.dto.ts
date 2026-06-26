import { IsString, IsNotEmpty } from 'class-validator';

export class AssignRolePermissionDto {
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @IsString()
  @IsNotEmpty()
  permissionId: string;
}
