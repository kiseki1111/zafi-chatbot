import { PartialType } from '@nestjs/swagger';
import { CreateChannelAccountDto } from './create-channel-account.dto';

export class UpdateChannelAccountDto extends PartialType(CreateChannelAccountDto) {}
