import { IsString, IsOptional } from 'class-validator';

export class OnboardingDto {
  @IsString()
  storeName: string;

  @IsString()
  category: string;

  @IsString()
  phone: string;

  @IsString()
  @IsOptional()
  address: string;

  @IsString()
  agentName: string;

  @IsString()
  agentTone: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  botToken?: string;
}
