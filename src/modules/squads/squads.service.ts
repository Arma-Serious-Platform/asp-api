import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSquadDto } from './dto/create-squad.dto';


@Injectable()
export class SquadsService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll() {
    return this.prisma.squad.findMany({
      omit: {
        leaderId: true,
        sideId: true,
      },
      include: {
        _count: true,
        leader: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          }
        },
        side: {
          select: {
            id: true,
            name: true,
            server: {
              select: {
                id: true,
                name: true,
                status: true,
              }
            },
            type: true,
          }
        }
      }
    });
  }

  async findOne(id: string) {
    return this.prisma.squad.findUnique({
      where: { id },
      omit: {
        sideId: true,
        leaderId: true
      },
      include: {
        members: {
          select: {
            id: true,
            nickname: true,
            role: true,
            avatarUrl: true,
            status: true,
          },
          orderBy: {
            nickname: 'asc'
          }
        },
        leader: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          }
        },
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

  async create(dto: CreateSquadDto) {
    const side = await this.prisma.side.findUnique({
      where: { id: dto.sideId },
    });

    if (!side) {
      throw new NotFoundException('Side not found');
    }

    const existingSquad = await this.prisma.squad.findFirst({
      where: {
        OR: [
          { name: dto.name },
          { tag: dto.tag },
        ],
      },
    });

    if (existingSquad) {
      throw new BadRequestException('Squad with this name or tag already exists');
    }

    const leader = await this.prisma.user.findUnique({
      where: { id: dto.leaderId },
      select: {
        id: true,
        leadingSquad: true,
      }
    });

    if (!leader) {
      throw new NotFoundException('Leader not found');
    }

    if (leader.leadingSquad) {
      throw new BadRequestException('Leader already in a squad');
    }

    return this.prisma.$transaction(async (tx) => {
      const squad = await tx.squad.create({
        data: {
          name: dto.name,
          tag: dto.tag,
          description: dto.description,
          side: {
            connect: {
              id: dto.sideId,
            },
          },
          leader: {
            connect: {
              id: dto.leaderId,
            },
          },
          activeCount: dto.activeCount,
          logoUrl: dto.logoUrl,
        },
      });

      await tx.user.update({
        where: { id: dto.leaderId },
        data: {
          squadId: squad.id,
        },
      });

      return squad;
    });
  }

  async delete(id: string) {
    const squad = await this.prisma.squad.findUnique({
      where: { id },
    });

    if (!squad) {
      throw new NotFoundException('Squad not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { squadId: id },
        data: { squadId: null },
      });

      await tx.squad.delete({
        where: { id },
      });
    });
  }
}
