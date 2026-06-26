import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  resource: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsOptional()
  description?: string;
}
