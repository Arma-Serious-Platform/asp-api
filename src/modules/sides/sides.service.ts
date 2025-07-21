import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { CreateSideDto } from './dto/create-side.dto';
import { UpdateSideDto } from './dto/update-side.dto';
import { AssignSquadDto } from './dto/assign-squad.dto';
import { UnassignSquadDto } from './dto/unassign-squad.dto';
import { AssignLeaderDto } from './dto/assign-leader.dto';

@Injectable()
export class SidesService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll() {
    return this.prisma.side.findMany({
      include: {
        leader: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          }
        },
        squads: {
          select: {
            id: true,
            name: true,
            tag: true,
            logoUrl: true,
          }
        },
        server: {
          select: {
            id: true,
            name: true,
            status: true,
          }
        }
      }
    });
  }

  async findOne(id: string) {
    return this.prisma.side.findUnique({
      where: { id },
      include: {
        leader: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          }
        },
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

  async assignLeader(dto: AssignLeaderDto) {
    const leader = await this.prisma.user.findUnique({
      where: { id: dto.leaderId },
      select: {
        id: true,
        squad: {
          select: {
            side: {
              select: {
                id: true,
              }
            }
          }
        }
      }
    });

    if (!leader) {
      throw new NotFoundException('User not found');
    }

    if (!leader.squad?.side?.id) {
      throw new BadRequestException('User is not in a squad');
    }

    if (leader.squad.side.id !== dto.sideId) {
      throw new BadRequestException('User squad is not in the corresponding side');
    }

    return this.prisma.side.update({
      where: { id: dto.sideId },
      data: {
        leader: {
          connect: {
            id: dto.leaderId,
          }
        }
      },
    });
  }
}
