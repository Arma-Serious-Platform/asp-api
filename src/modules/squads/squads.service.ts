import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignSquadToSideDto } from './dto/assign-squad-to-side.dto';

@Injectable()
export class SquadsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.squad.findMany();
  }

  async findOne(id: string) {
    return this.prisma.squad.findUnique({
      where: { id },
      include: {
        side: {
          select: {
            id: true,
            name: true,
            server: true,
            type: true,
          },
        },
      },
    });
  }

  async assignSquadToSide(dto: AssignSquadToSideDto) {
    const side = await this.prisma.side.findUnique({
      where: { id: dto.sideId },
    });

    if (!side) {
      throw new NotFoundException('Side not found');
    }

    const squad = await this.prisma.squad.findUnique({
      where: { id: dto.squadId },
    });

    if (!squad) {
      throw new NotFoundException('Squad not found');
    }

    return this.prisma.squad.update({
      where: { id: dto.squadId },
      data: { side: { connect: { id: dto.sideId } } },
    });
  }
}
