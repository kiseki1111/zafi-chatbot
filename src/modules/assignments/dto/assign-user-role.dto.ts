import { IsString, IsNotEmpty } from 'class-validator';

export class AssignUserRoleDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  roleId: string;
}
