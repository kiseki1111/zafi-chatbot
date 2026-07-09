import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateChannelAccountDto } from './dto/create-channel-account.dto';
import { UpdateChannelAccountDto } from './dto/update-channel-account.dto';

@Injectable()
export class ChannelAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createChannelAccountDto: CreateChannelAccountDto & { divisionId?: string, divisionName?: string }) {
    let divisionId = createChannelAccountDto.divisionId;
    if (!divisionId && createChannelAccountDto.divisionName) {
      let div = await this.prisma.division.findFirst({
        where: { name: { equals: createChannelAccountDto.divisionName, mode: 'insensitive' as any } }
      });
      if (!div) {
        div = await this.prisma.division.create({
          data: { name: createChannelAccountDto.divisionName, description: 'Auto-generated division' }
        });
      }
      divisionId = div.id;
    }

    return this.prisma.channelAccount.create({
      data: {
        name: createChannelAccountDto.name,
        description: createChannelAccountDto.description,
        divisionId,
      },
    });
  }

  async findAll(divisionName?: string) {
    const where = divisionName ? { division: { is: { name: { equals: divisionName, mode: 'insensitive' as any } } } } : {};
    return this.prisma.channelAccount.findMany({
      where,
      include: {
        whatsappInstances: true,
        division: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getDivisions() {
    return this.prisma.division.findMany();
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
