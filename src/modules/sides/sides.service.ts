import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSideDto } from './dto/create-side.dto';
import { UpdateSideDto } from './dto/update-side.dto';
import { AssignSquadDto } from './dto/assign-squad.dto';
import { UnassignSquadDto } from './dto/unassign-squad.dto';

@Injectable()
export class SidesService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll() {
    return this.prisma.side.findMany();
  }

  async findOne(id: string) {
    return this.prisma.side.findUnique({
      where: { id },
      include: {
        squads: {
          select: {
            id: true,
            name: true,
            tag: true,
            logoUrl: true,
          },
        },
      },
    });
  }

  async create(data: CreateSideDto) {
    return this.prisma.side.create({
      data,
    });
  }

  async update(id: string, data: UpdateSideDto) {
    return this.prisma.side.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.side.delete({
      where: { id },
    });
  }

  async assignSquad(dto: AssignSquadDto) {
    return this.prisma.side.update({
      where: { id: dto.sideId },
      data: { squads: { connect: { id: dto.squadId } } },
    });
  }

  async unassignSquad(dto: UnassignSquadDto) {
    return this.prisma.side.update({
      where: { id: dto.sideId },
      data: { squads: { disconnect: { id: dto.squadId } } },
    });
  }
}
