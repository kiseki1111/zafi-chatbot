import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateChannelAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  divisionId?: string;

  @IsString()
  @IsOptional()
  divisionName?: string;
}
