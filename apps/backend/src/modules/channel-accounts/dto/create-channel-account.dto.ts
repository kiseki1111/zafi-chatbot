import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateChannelAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

}
