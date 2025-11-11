import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { CreateSquadDto } from './dto/create-squad.dto';
import { InviteToSquadDto } from './dto/invite-to-squad.dto';
import { Prisma, SquadInviteStatus } from '@prisma/client';
import { FindSquadsDto } from './dto/find-squads.dto';
import { ASP_BUCKET } from 'src/infrastructure/minio/minio.lib';
import { MinioService } from 'src/infrastructure/minio/minio.service';
import { UpdateSquadDto } from './dto/update-squad.dto';

@Injectable()
export class SquadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) { }

  async findAll(dto: FindSquadsDto) {
    const { take = 50, skip = 0 } = dto;

    const options: Prisma.SquadFindManyArgs = {
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
          },
        },
        logo: {
          select: {
            id: true,
            url: true,
          },
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
              },
            },
            type: true,
          },
        },
      },
    };

    if (dto.search) {
      options.where = {
        OR: [
          { name: { contains: dto.search, mode: 'insensitive' } },
          { tag: { contains: dto.search, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.squad.findMany({
        ...options,
        skip,
        take,
      }),
      this.prisma.squad.count(),
    ]);

    return {
      data,
      total,
    };
  }

  async findOne(id: string) {
    return this.prisma.squad.findUnique({
      where: { id },
      omit: {
        sideId: true,
        leaderId: true,
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
            nickname: 'asc',
          },
        },
        leader: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
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
        OR: [{ name: dto.name }, { tag: dto.tag }],
      },
    });

    if (existingSquad) {
      throw new BadRequestException(
        'Squad with this name or tag already exists',
      );
    }

    const leader = await this.prisma.user.findUnique({
      where: { id: dto.leaderId },
      select: {
        id: true,
        leadingSquad: true,
      },
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
        },
      });

      if (dto.logo) {
        const url = await this.minioService.uploadFile(
          ASP_BUCKET.SQUADS,
          dto.logo,
        );

        await tx.squad.update({
          where: { id: squad.id },
          data: { logoId: url.id },
        });
      }

      await tx.user.update({
        where: { id: dto.leaderId },
        data: {
          squadId: squad.id,
        },
      });

      return squad;
    });
  }

  async update(id: string, dto: UpdateSquadDto) {
    if (dto.sideId) {
      const side = await this.prisma.side.findUnique({
        where: { id: dto.sideId },
      });

      if (!side) {
        throw new NotFoundException('Side not found');
      }
    }

    if (dto.leaderId) {
      const leader = await this.prisma.user.findUnique({
        where: { id: dto.leaderId },
        select: {
          id: true,
          leadingSquad: true,
        },
      });

      if (!leader) {
        throw new NotFoundException('Leader not found');
      }

      if (leader.leadingSquad) {
        throw new BadRequestException('Leader already in a squad');
      }
    }


    return this.prisma.$transaction(async (tx) => {
      const squad = await tx.squad.update({
        where: { id },
        data: {
          ...(dto.sideId && { side: { connect: { id: dto.sideId } } }),
          ...(dto.leaderId && { leader: { connect: { id: dto.leaderId } } }),
          ...(dto.name && { name: dto.name }),
          ...(dto.tag && { tag: dto.tag }),
          ...(dto.description && { description: dto.description }),
          ...(typeof dto.activeCount === 'number' && { activeCount: dto.activeCount }),
        },
      });

      if (dto.logo) {
        const url = await this.minioService.uploadFile(
          ASP_BUCKET.SQUADS,
          dto.logo,
        );

        await tx.squad.update({
          where: { id: squad.id },
          data: { logoId: url.id },
        });
      }

      if (dto.leaderId) {
        await tx.user.update({
          where: { id: dto.leaderId },
          data: {
            squadId: squad.id,
          },
        });
      }

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

  async inviteToSquad(dto: InviteToSquadDto, leaderId: string) {
    const squad = await this.prisma.squad.findUnique({
      where: { id: dto.squadId },
    });

    if (!squad) {
      throw new NotFoundException('Squad not found');
    }

    const leader = await this.prisma.user.findUnique({
      where: { id: leaderId },
      select: {
        id: true,
        leadingSquad: {
          select: {
            id: true,
          },
        },
      },
    });

    if (leader?.leadingSquad?.id !== squad.id) {
      throw new BadRequestException('You are not the leader of this squad');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: {
        id: true,
        squadId: true,
        squadInvites: {
          select: {
            id: true,
            squadId: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.squadId) {
      throw new BadRequestException('User already in a squad');
    }

    const alreadyInvited = await this.prisma.squadInvitation.findFirst({
      where: {
        userId: dto.userId,
        squadId: dto.squadId,
        status: {
          equals: SquadInviteStatus.PENDING,
        },
      },
    });

    if (alreadyInvited) {
      throw new BadRequestException(
        'User already has an invitation to this squad',
      );
    }

    return this.prisma.squadInvitation.create({
      data: {
        status: SquadInviteStatus.PENDING,
        user: {
          connect: { id: dto.userId },
        },
        squad: {
          connect: { id: dto.squadId },
        },
      },
    });
  }

  async acceptInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.squadInvitation.findUnique({
      where: { id: invitationId },
    });

    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        squad: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!me) {
      throw new NotFoundException('User not found');
    }

    if (me.squad?.id) {
      await this.prisma.squadInvitation.delete({
        where: { id: invitationId },
      });

      throw new BadRequestException('You are already in a squad');
    }

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== SquadInviteStatus.PENDING) {
      throw new BadRequestException('Invitation is not pending');
    }

    return this.prisma.squadInvitation.update({
      where: { id: invitationId },
      data: { status: SquadInviteStatus.ACCEPTED },
    });
  }

  async getMyInvitations(userId: string) {
    return this.prisma.squadInvitation.findMany({
      where: {
        userId,
        status: SquadInviteStatus.PENDING,
      },
      include: {
        squad: {
          select: {
            id: true,
            name: true,
            tag: true,
            logo: {
              select: {
                id: true,
                url: true,
              },
            },
            description: true,
          },
        },
      },
    });
  }

  async getMySquadInvitations(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        leadingSquad: {
          where: {
            invites: {
              every: {
                status: SquadInviteStatus.PENDING,
              },
            },
          },
          select: {
            id: true,
            invites: {
              select: {
                id: true,
                status: true,
                user: {
                  select: {
                    id: true,
                    nickname: true,
                    status: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.leadingSquad) {
      throw new BadRequestException('You are not a leader of any squad');
    }

    return user.leadingSquad.invites;
  }

  async rejectInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.squadInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== SquadInviteStatus.PENDING) {
      throw new BadRequestException('Invitation is not pending');
    }

    return this.prisma.squadInvitation.update({
      where: { id: invitationId },
      data: { status: SquadInviteStatus.REJECTED },
    });
  }

  async cancelInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.squadInvitation.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        status: true,
        squad: {
          select: {
            leader: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== SquadInviteStatus.PENDING) {
      throw new BadRequestException('Invitation is not pending');
    }

    if (invitation.squad.leader.id !== userId) {
      throw new BadRequestException('You are not the leader of this squad');
    }

    return this.prisma.squadInvitation.delete({
      where: { id: invitationId },
    });
  }
}
