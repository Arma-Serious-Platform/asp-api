import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { CreateSquadDto } from './dto/create-squad.dto';
import { InviteToSquadDto } from './dto/invite-to-squad.dto';
import { Prisma, SquadInviteStatus, SquadRole } from '@prisma/client';
import { FindSquadsDto } from './dto/find-squads.dto';
import { ASP_BUCKET } from 'src/infrastructure/minio/minio.lib';
import { MinioService } from 'src/infrastructure/minio/minio.service';
import { UpdateSquadDto } from './dto/update-squad.dto';
import { KickFromSquadDto } from './dto/kick-from-squad.dto';
import { UpdateMySquadDto } from './dto/update-my-squad.dto';

/** Prisma squad ids are UUIDs; only then include `id` in lookup to avoid invalid UUID queries. */
const UUID_PARAM_RE = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

function isUuidParam(value: string): boolean {
  return UUID_PARAM_RE.test(value);
}

@Injectable()
export class SquadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) { }

  private async clampActiveCount(tx: Prisma.TransactionClient, squadId: string, activeCount?: number) {
    if (typeof activeCount !== 'number') {
      return undefined;
    }

    const membersCount = await tx.user.count({
      where: { squadId },
    });

    return Math.min(activeCount, membersCount);
  }

  async findAll(dto: FindSquadsDto) {
    const { take = 50, skip = 0 } = dto;

    const options: Prisma.SquadFindManyArgs = {
      omit: {
        leaderId: true,
        sideId: true,
      },
      include: {
        _count: {
          select: {
            members: true
          }
        },
        leader: {
          select: {
            id: true,
            nickname: true,
            role: true,
            squadRole: true,
            avatarUrl: true,
            specializations: {
              include: {
                icon: {
                  select: {
                    id: true,
                    bucket: true,
                    filename: true,
                    url: true,
                  },
                },
              },
              orderBy: {
                name: 'asc',
              },
            },
            avatar: {
              select: {
                id: true,
                url: true,
              },
            },
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

  async findOne(identifier: string) {
    const key = identifier.trim();
    if (!key) {
      throw new NotFoundException('Squad not found');
    }

    const orConditions: Prisma.SquadWhereInput[] = [
      { tag: key },
      { name: key },
    ];
    if (isUuidParam(key)) {
      orConditions.unshift({ id: key });
    }

    const squad = await this.prisma.squad.findFirst({
      where: { OR: orConditions },
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
            squadRole: true,
            avatarUrl: true,
            status: true,
            specializations: {
              include: {
                icon: {
                  select: {
                    id: true,
                    bucket: true,
                    filename: true,
                    url: true,
                  },
                },
              },
              orderBy: {
                name: 'asc',
              },
            },
            avatar: {
              select: {
                id: true,
                url: true,
              },
            },
          },
          orderBy: {
            nickname: 'asc',
          },
        },
        leader: {
          select: {
            id: true,
            nickname: true,
            role: true,
            squadRole: true,
            avatarUrl: true,
            specializations: {
              include: {
                icon: {
                  select: {
                    id: true,
                    bucket: true,
                    filename: true,
                    url: true,
                  },
                },
              },
              orderBy: {
                name: 'asc',
              },
            },
            avatar: {
              select: {
                id: true,
                url: true,
              },
            },
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
            server: true,
            type: true,
          },
        },
      },
    });

    if (!squad) {
      throw new NotFoundException('Squad not found');
    }

    return squad;
  }

  async create(dto: CreateSquadDto, logo?: File) {
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
        },
      });

      if (logo) {
        const url = await this.minioService.uploadFile(
          ASP_BUCKET.SQUADS,
          logo,
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
          squadRole: SquadRole.MEMBER,
        },
      });

      if (typeof dto.activeCount === 'number') {
        return tx.squad.update({
          where: { id: squad.id },
          data: {
            activeCount: await this.clampActiveCount(tx, squad.id, dto.activeCount),
          },
        });
      }

      return squad;
    });
  }

  async updateByAdmin(id: string, dto: UpdateSquadDto, logo?: File) {
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
      let squad = await tx.squad.update({
        where: { id },
        data: {
          ...(dto.sideId && { side: { connect: { id: dto.sideId } } }),
          ...(dto.leaderId && { leader: { connect: { id: dto.leaderId } } }),
          ...(dto.name && { name: dto.name }),
          ...(dto.tag && { tag: dto.tag }),
          ...(dto.description && { description: dto.description }),
          ...(typeof dto.recruiting === 'boolean' && { recruiting: dto.recruiting }),
          ...(dto.telegramUrl !== undefined && { telegramUrl: dto.telegramUrl }),
          ...(dto.discordUrl !== undefined && { discordUrl: dto.discordUrl }),
          ...(dto.youtubeUrl !== undefined && { youtubeUrl: dto.youtubeUrl }),
          ...(dto.twitchUrl !== undefined && { twitchUrl: dto.twitchUrl }),
          ...(dto.tiktokUrl !== undefined && { tiktokUrl: dto.tiktokUrl }),
        },
      });

      if (logo) {
        const url = await this.minioService.uploadFile(
          ASP_BUCKET.SQUADS,
          logo,
        );

        squad = await tx.squad.update({
          where: { id: squad.id },
          data: { logoId: url.id },
        });
      }

      if (dto.leaderId) {
        await tx.user.update({
          where: { id: dto.leaderId },
          data: {
            squadId: squad.id,
            squadRole: SquadRole.MEMBER,
          },
        });
      }

      if (typeof dto.activeCount === 'number') {
        squad = await tx.squad.update({
          where: { id: squad.id },
          data: {
            activeCount: await this.clampActiveCount(tx, squad.id, dto.activeCount),
          },
        });
      }

      return squad;
    });
  }

  async updateMySquad(userId: string, dto: UpdateMySquadDto, logo?: File) {
    const managedSquad = await this.getSquadManagedByUser(userId);

    return this.prisma.$transaction(async (tx) => {
      const activeCount = await this.clampActiveCount(tx, managedSquad.id, dto.activeCount);

      let squad = await tx.squad.update({
        where: { id: managedSquad.id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.tag && { tag: dto.tag }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(typeof dto.recruiting === 'boolean' && { recruiting: dto.recruiting }),
          ...(activeCount !== undefined && { activeCount }),
          ...(dto.telegramUrl !== undefined && { telegramUrl: dto.telegramUrl }),
          ...(dto.discordUrl !== undefined && { discordUrl: dto.discordUrl }),
          ...(dto.youtubeUrl !== undefined && { youtubeUrl: dto.youtubeUrl }),
          ...(dto.twitchUrl !== undefined && { twitchUrl: dto.twitchUrl }),
          ...(dto.tiktokUrl !== undefined && { tiktokUrl: dto.tiktokUrl }),
        },
      });

      if (logo) {
        const url = await this.minioService.uploadFile(
          ASP_BUCKET.SQUADS,
          logo,
        );

        squad = await tx.squad.update({
          where: { id: squad.id },
          data: { logoId: url.id },
        });
      }

      return squad;
    });
  }

  async transferLeadership(leaderId: string, newLeaderId: string) {
    if (leaderId === newLeaderId) {
      throw new BadRequestException('You are already the leader of this squad');
    }

    const squad = await this.prisma.squad.findUnique({
      where: { leaderId },
      select: {
        id: true,
      },
    });

    if (!squad) {
      throw new BadRequestException('You are not the leader of any squad');
    }

    const newLeader = await this.prisma.user.findUnique({
      where: { id: newLeaderId },
      select: {
        id: true,
        squadId: true,
      },
    });

    if (!newLeader) {
      throw new NotFoundException('New leader not found');
    }

    if (newLeader.squadId !== squad.id) {
      throw new BadRequestException('New leader must be a member of your squad');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedSquad = await tx.squad.update({
        where: { id: squad.id },
        data: { leaderId: newLeader.id },
      });

      await tx.user.update({
        where: { id: leaderId },
        data: {
          squadRole: SquadRole.SUBLEADER,
        },
      });

      await tx.user.update({
        where: { id: newLeader.id },
        data: {
          squadRole: SquadRole.MEMBER,
        },
      });

      return updatedSquad;
    });
  }

  async updateMemberRole(actorId: string, memberId: string, role: SquadRole) {
    const squad = await this.getSquadManagedByUser(actorId);

    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        squadId: true,
      },
    });

    if (!member) {
      throw new NotFoundException('User not found');
    }

    if (member.squadId !== squad.id) {
      throw new BadRequestException('User is not in your squad');
    }

    if (member.id === squad.leaderId) {
      throw new BadRequestException('Cannot change squad role of the current leader');
    }

    if (!squad.isActorLeader && role === SquadRole.SUBLEADER) {
      throw new BadRequestException('Only squad leader can assign subleader role');
    }

    return this.prisma.user.update({
      where: { id: member.id },
      data: { squadRole: role },
      select: {
        id: true,
        nickname: true,
        squadRole: true,
      },
    });
  }

  async requestToJoinSquad(squadId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        squadId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.squadId) {
      throw new BadRequestException('You are already in a squad');
    }

    const squad = await this.prisma.squad.findUnique({
      where: { id: squadId },
      select: {
        id: true,
        recruiting: true,
      },
    });

    if (!squad) {
      throw new NotFoundException('Squad not found');
    }

    if (!squad.recruiting) {
      throw new BadRequestException('Squad is not recruiting');
    }

    const existingRequest = await this.prisma.squadJoinRequest.findFirst({
      where: {
        userId,
        squadId,
        status: SquadInviteStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new BadRequestException('You already have a pending request to this squad');
    }

    return this.prisma.squadJoinRequest.create({
      data: {
        status: SquadInviteStatus.PENDING,
        user: {
          connect: { id: userId },
        },
        squad: {
          connect: { id: squadId },
        },
      },
    });
  }

  async getMyJoinRequests(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        squadId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.squadId) {
      throw new BadRequestException('You are already in a squad');
    }

    return this.prisma.squadJoinRequest.findMany({
      where: {
        userId,
        status: SquadInviteStatus.PENDING,
      },
      select: {
        id: true,
        status: true,
        squadId: true,
        createdAt: true,
        updatedAt: true,
        squad: {
          select: {
            id: true,
            name: true,
            tag: true,
            recruiting: true,
            logo: {
              select: {
                id: true,
                url: true,
              },
            },
            description: true,
            side: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMySquadJoinRequests(leaderId: string) {
    const managedSquad = await this.getSquadManagedByUser(leaderId);

    const squad = await this.prisma.squad.findUnique({
      where: { id: managedSquad.id },
      select: {
        id: true,
        joinRequests: {
          where: {
            status: SquadInviteStatus.PENDING,
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                nickname: true,
                status: true,
                avatarUrl: true,
                avatar: {
                  select: {
                    id: true,
                    url: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!squad) {
      throw new NotFoundException('Squad not found');
    }

    return squad.joinRequests;
  }

  async acceptJoinRequest(requestId: string, leaderId: string) {
    const request = await this.prisma.squadJoinRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        userId: true,
        squadId: true,
        user: {
          select: {
            id: true,
            squadId: true,
          },
        },
        squad: {
          select: {
            id: true,
            leaderId: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    const managedSquad = await this.getSquadManagedByUser(leaderId);

    if (request.squadId !== managedSquad.id) {
      throw new BadRequestException('You are not allowed to manage this request');
    }

    if (request.status !== SquadInviteStatus.PENDING) {
      throw new BadRequestException('Join request is not pending');
    }

    if (request.user.squadId) {
      throw new BadRequestException('User already in a squad');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: request.userId },
        data: {
          squadId: request.squadId,
          squadRole: SquadRole.RECRUIT,
        },
      });

      const acceptedRequest = await tx.squadJoinRequest.update({
        where: { id: request.id },
        data: { status: SquadInviteStatus.ACCEPTED },
      });

      await tx.squadJoinRequest.deleteMany({
        where: {
          userId: request.userId,
          status: SquadInviteStatus.PENDING,
        },
      });

      await tx.squadInvitation.deleteMany({
        where: {
          userId: request.userId,
          status: SquadInviteStatus.PENDING,
        },
      });

      return acceptedRequest;
    });
  }

  async rejectJoinRequest(requestId: string, userId: string) {
    const request = await this.prisma.squadJoinRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        squadId: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    const managedSquad = await this.getSquadManagedByUser(userId);

    if (request.squadId !== managedSquad.id) {
      throw new BadRequestException('You are not allowed to manage this request');
    }

    if (request.status !== SquadInviteStatus.PENDING) {
      throw new BadRequestException('Join request is not pending');
    }

    return this.prisma.squadJoinRequest.update({
      where: { id: request.id },
      data: { status: SquadInviteStatus.REJECTED },
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
        data: {
          squadId: null,
          squadRole: SquadRole.MEMBER,
        },
      });

      await tx.squadInvitation.deleteMany({
        where: { squadId: id },
      });

      await tx.squadJoinRequest.deleteMany({
        where: { squadId: id },
      });

      await tx.squad.delete({
        where: { id },
      });
    });
  }

  async inviteToSquad(dto: InviteToSquadDto, leaderId: string) {
    const squad = await this.getSquadManagedByUser(leaderId);

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
        squadId: squad.id,
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
        squadRole: dto.squadRole ?? SquadRole.MEMBER,
        user: {
          connect: { id: dto.userId },
        },
        squad: {
          connect: { id: squad.id },
        },
      },
    });
  }

  async kickFromSquad(dto: KickFromSquadDto, leaderId: string) {
    const squad = await this.getSquadManagedByUser(leaderId);

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: {
        id: true,
        squadId: true,
        squadRole: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.squadId !== squad.id) {
      throw new BadRequestException('User is not in this squad');
    }

    if (user.id === squad.leaderId) {
      throw new BadRequestException('You cannot kick the squad leader');
    }

    if (!squad.isActorLeader && user.squadRole === SquadRole.SUBLEADER) {
      throw new BadRequestException('Subleader cannot kick another subleader');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: dto.userId },
        data: {
          squadId: null,
          squadRole: SquadRole.MEMBER,
          specializations: {
            set: [],
          },
        },
      });

      const deletedInvitations = await tx.squadInvitation.deleteMany({
        where: { userId: dto.userId, squadId: squad.id },
      });

      const membersCount = await tx.user.count({
        where: { squadId: squad.id },
      });

      await tx.squad.updateMany({
        where: {
          id: squad.id,
          activeCount: {
            gt: membersCount,
          },
        },
        data: {
          activeCount: membersCount,
        },
      });

      return deletedInvitations;
    });
  }

  async leaveFromSquad(userId: string, newLeaderId?: string) {
    if (userId === newLeaderId) {
      throw new BadRequestException('You cannot leave the squad & assign yourself as the new leader');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        squadId: true,
        squad: {
          select: {
            id: true,
            leaderId: true
          }
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }


    if (!user.squadId) {
      throw new NotFoundException('Squad not found');
    }

    const isUserLeader = user.id === user?.squad?.leaderId;

    if (isUserLeader && !newLeaderId) {
      throw new BadRequestException('You are the leader of this squad & you need to assign a new leader');
    }

    if (isUserLeader && newLeaderId) {
      const newLeader = await this.prisma.user.findUnique({
        where: { id: newLeaderId, squadId: user.squadId },
      });

      if (!newLeader) {
        throw new NotFoundException('New leader not found');
      }

      await this.prisma.squad.update({
        where: { id: user.squadId },
        data: { leaderId: newLeaderId },
      });

      await this.prisma.user.update({
        where: { id: newLeaderId },
        data: { squadRole: SquadRole.MEMBER },
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        squadId: null,
        squadRole: SquadRole.MEMBER,
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

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          squadId: invitation.squadId,
          squadRole: invitation.squadRole,
        },
      });

      const acceptedInvitation = await tx.squadInvitation.update({
        where: { id: invitationId },
        data: { status: SquadInviteStatus.ACCEPTED },
      });

      await tx.squadInvitation.deleteMany({
        where: {
          userId,
          status: SquadInviteStatus.PENDING,
        },
      });

      await tx.squadJoinRequest.deleteMany({
        where: {
          userId,
          status: SquadInviteStatus.PENDING,
        },
      });

      return acceptedInvitation;
    });
  }

  async getMyInvitations(userId: string) {
    return this.prisma.squadInvitation.findMany({
      where: {
        userId,
        status: SquadInviteStatus.PENDING,
      },
      select: {
        id: true,
        status: true,
        squadRole: true,
        squadId: true,
        createdAt: true,
        updatedAt: true,
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
                squadRole: true,
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

    if (!invitation.squad.leader || invitation.squad.leader.id !== userId) {
      throw new BadRequestException('You are not the leader of this squad');
    }

    return this.prisma.squadInvitation.delete({
      where: { id: invitationId },
    });
  }

  private async getSquadManagedByUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        squadRole: true,
        squadId: true,
        squad: {
          select: {
            id: true,
            leaderId: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.squadId || !user.squad) {
      throw new BadRequestException('You are not in a squad');
    }

    const isLeader = user.squad.leaderId === user.id;
    const isSubleader = user.squadRole === SquadRole.SUBLEADER;

    if (!isLeader && !isSubleader) {
      throw new BadRequestException('You are not allowed to manage this squad');
    }

    return {
      ...user.squad,
      isActorLeader: isLeader,
      actorSquadRole: user.squadRole,
    };
  }
}
