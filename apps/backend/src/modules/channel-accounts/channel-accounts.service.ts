import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateChannelAccountDto } from './dto/create-channel-account.dto';
import { UpdateChannelAccountDto } from './dto/update-channel-account.dto';

@Injectable()
export class ChannelAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createChannelAccountDto: CreateChannelAccountDto) {
    return this.prisma.channelAccount.create({
      data: {
        name: createChannelAccountDto.name,
        description: createChannelAccountDto.description,
      },
    });
  }

  async findAll() {
    return this.prisma.channelAccount.findMany({
      include: {
        whatsappInstances: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    return this.prisma.channelAccount.findUnique({
      where: { id },
      include: {
        whatsappInstances: true,
      },
    });
  }

  async update(id: string, updateChannelAccountDto: UpdateChannelAccountDto) {
    return this.prisma.channelAccount.update({
      where: { id },
      data: updateChannelAccountDto,
    });
  }

  async remove(id: string) {
    return this.prisma.channelAccount.delete({
      where: { id },
    });
  }
}
