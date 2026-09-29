import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { FindPublicListDto } from './dto/find-public-list.dto';
import { FindPublicUsersDto } from './dto/find-public-users.dto';
import { FindPublicWeekendsDto } from './dto/find-public-weekends.dto';

@Injectable()
export class PublicApiService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly avatarSelect = {
    id: true,
    url: true,
  } satisfies Prisma.FileSelect;

  private readonly sideSelect = {
    id: true,
    name: true,
    type: true,
  } satisfies Prisma.SideSelect;

  private readonly userSelect = {
    id: true,
    nickname: true,
    status: true,
    roles: true,
    steamId: true,
    telegramUrl: true,
    discordUrl: true,
    youtubeUrl: true,
    twitchUrl: true,
    tiktokUrl: true,
    avatar: { select: this.avatarSelect },
    squad: {
      select: {
        id: true,
        name: true,
        tag: true,
        leaderId: true,
        side: { select: this.sideSelect },
      },
    },
  } satisfies Prisma.UserSelect;

  private readonly missionVersionScalarSelect = {
    id: true,
    version: true,
    missionId: true,
    status: true,
    attackSideType: true,
    defenseSideType: true,
    friendlySideType: true,
    friendlyTo: true,
    attackSideSlots: true,
    defenseSideSlots: true,
    friendlySideSlots: true,
    minSlotsToPlay: true,
    attackSideName: true,
    defenseSideName: true,
    friendlySideName: true,
    changesDescription: true,
    inGameTime: true,
    weather: true,
    weaponry: true,
    rating: true,
    fileId: true,
    createdAt: true,
    updatedAt: true,
    file: {
      select: {
        id: true,
        url: true,
        filename: true,
      },
    },
    uniformScreenshots: {
      select: {
        side: true,
        file: {
          select: {
            id: true,
            url: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' as const },
    },
  } satisfies Prisma.MissionVersionSelect;

  private readonly missionVersionWithSlotsSelect = {
    ...this.missionVersionScalarSelect,
    missionAttackSlots: true,
    missionDefenceSlots: true,
    missionFriendlySlots: true,
  } satisfies Prisma.MissionVersionSelect;

  private readonly weekendInclude = {
    games: {
      include: {
        mission: {
          select: {
            id: true,
            name: true,
          },
        },
        missionVersion: {
          select: {
            id: true,
            version: true,
            attackSideName: true,
            defenseSideName: true,
            friendlySideName: true,
            attackSideType: true,
            defenseSideType: true,
            friendlySideType: true,
            attackSideSlots: true,
            defenseSideSlots: true,
            friendlySideSlots: true,
            mission: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        attackSide: { select: this.sideSelect },
        defenseSide: { select: this.sideSelect },
      },
      orderBy: [{ position: 'asc' as const }, { date: 'asc' as const }],
    },
  } satisfies Prisma.WeekendInclude;

  private readonly newsInclude = {
    author: {
      select: {
        id: true,
        nickname: true,
      },
    },
    image: {
      select: {
        id: true,
        url: true,
        filename: true,
      },
    },
    attachments: {
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        file: {
          select: {
            id: true,
            url: true,
            filename: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' as const },
    },
  } satisfies Prisma.NewsInclude;

  async findUsers(dto: FindPublicUsersDto) {
    const take = Number(dto.take ?? 100);
    const skip = Number(dto.skip ?? 0);
    const nickname = (dto.nickname ?? dto.search)?.trim();

    const where: Prisma.UserWhereInput = {
      ...(nickname
        ? { nickname: { contains: nickname, mode: 'insensitive' } }
        : {}),
      ...(dto.squadId ? { squadId: dto.squadId } : {}),
      ...(dto.role ? { roles: { has: dto.role as UserRole } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: this.userSelect,
        orderBy: { nickname: 'asc' },
        take,
        skip,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findWeekends(dto: FindPublicWeekendsDto) {
    const take = Number(dto.take ?? 100);
    const skip = Number(dto.skip ?? 0);
    const search = dto.search?.trim();

    const where: Prisma.WeekendWhereInput = {
      ...(dto.published !== undefined ? { published: dto.published } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.weekend.findMany({
        where,
        include: this.weekendInclude,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.weekend.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findWeekendById(id: string) {
    const weekend = await this.prisma.weekend.findUnique({
      where: { id },
      include: this.weekendInclude,
    });

    if (!weekend) {
      throw new NotFoundException('Weekend not found');
    }

    return weekend;
  }

  async findNews(dto: FindPublicListDto) {
    const take = Number(dto.take ?? 50);
    const skip = Number(dto.skip ?? 0);
    const search = dto.search?.trim();

    const where: Prisma.NewsWhereInput = {
      published: true,
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.news.findMany({
        where,
        include: this.newsInclude,
        orderBy: { date: 'desc' },
        take,
        skip,
      }),
      this.prisma.news.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findNewsById(id: string) {
    const news = await this.prisma.news.findFirst({
      where: { id, published: true },
      include: this.newsInclude,
    });

    if (!news) {
      throw new NotFoundException('News not found');
    }

    return news;
  }

  async findFeed(dto: FindPublicListDto) {
    const skip = Number(dto.skip ?? 0);
    const take = Number(dto.take ?? 50);
    const window = skip + take;

    const [newsPage, weekendsPage] = await Promise.all([
      this.findNews({ skip: 0, take: window }),
      this.findWeekends({ published: true, skip: 0, take: window }),
    ]);

    const newsItems = newsPage.data.map((item) => ({
      id: item.id,
      type: 'news' as const,
      data: item,
      sortAt: new Date(item.date).getTime(),
    }));

    const weekendItems = weekendsPage.data.map((item) => ({
      id: item.id,
      type: 'weekends' as const,
      data: item,
      sortAt: new Date(item.games?.[0]?.date ?? item.createdAt).getTime(),
    }));

    const merged = [...newsItems, ...weekendItems].sort(
      (a, b) => b.sortAt - a.sortAt,
    );

    const data = merged
      .slice(skip, skip + take)
      .map(({ sortAt: _sortAt, ...item }) => item);

    return {
      data,
      total: newsPage.total + weekendsPage.total,
      skip,
      take,
    };
  }

  async findSquads(dto: FindPublicListDto) {
    const take = Number(dto.take ?? 50);
    const skip = Number(dto.skip ?? 0);
    const search = dto.search?.trim();

    const where: Prisma.SquadWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { tag: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.squad.findMany({
        where,
        select: {
          id: true,
          name: true,
          tag: true,
          description: true,
          activeCount: true,
          leaderId: true,
          telegramUrl: true,
          discordUrl: true,
          createdAt: true,
          updatedAt: true,
          logo: { select: this.avatarSelect },
          leader: {
            select: {
              id: true,
              nickname: true,
              avatar: { select: this.avatarSelect },
            },
          },
          side: { select: this.sideSelect },
          _count: { select: { members: true } },
        },
        orderBy: { name: 'asc' },
        take,
        skip,
      }),
      this.prisma.squad.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findSquadById(id: string) {
    const squad = await this.prisma.squad.findFirst({
      where: {
        OR: [{ id }, { tag: id }, { name: id }],
      },
      select: {
        id: true,
        name: true,
        tag: true,
        description: true,
        activeCount: true,
        leaderId: true,
        telegramUrl: true,
        discordUrl: true,
        createdAt: true,
        updatedAt: true,
        logo: { select: this.avatarSelect },
        leader: {
          select: {
            id: true,
            nickname: true,
            avatar: { select: this.avatarSelect },
          },
        },
        side: { select: this.sideSelect },
        members: {
          select: {
            id: true,
            nickname: true,
            roles: true,
            squadRole: true,
            avatar: { select: this.avatarSelect },
          },
          orderBy: { nickname: 'asc' },
        },
        _count: { select: { members: true } },
      },
    });

    if (!squad) {
      throw new NotFoundException('Squad not found');
    }

    return squad;
  }

  async findSides(dto: FindPublicListDto) {
    const take = Number(dto.take ?? 50);
    const skip = Number(dto.skip ?? 0);

    const [data, total] = await Promise.all([
      this.prisma.side.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          server: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          squads: {
            select: {
              id: true,
              name: true,
              tag: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        take,
        skip,
      }),
      this.prisma.side.count(),
    ]);

    return { data, total, skip, take };
  }

  async findSideById(id: string) {
    const side = await this.prisma.side.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        server: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        squads: {
          select: {
            id: true,
            name: true,
            tag: true,
          },
        },
      },
    });

    if (!side) {
      throw new NotFoundException('Side not found');
    }

    return side;
  }

  async findMissions(dto: FindPublicListDto) {
    const take = Number(dto.take ?? 100);
    const skip = Number(dto.skip ?? 0);
    const search = dto.search?.trim();

    const where: Prisma.MissionWhereInput = {
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.mission.findMany({
        where,
        select: {
          id: true,
          name: true,
          missionType: true,
          missionObjective: true,
          state: true,
          createdAt: true,
          updatedAt: true,
          image: { select: this.avatarSelect },
          island: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          author: {
            select: {
              id: true,
              nickname: true,
            },
          },
          missionVersions: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: this.missionVersionScalarSelect,
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.mission.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findMissionById(id: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        missionType: true,
        missionObjective: true,
        state: true,
        createdAt: true,
        updatedAt: true,
        image: { select: this.avatarSelect },
        island: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        author: {
          select: {
            id: true,
            nickname: true,
          },
        },
        coauthors: {
          select: {
            id: true,
            nickname: true,
          },
        },
        missionVersions: {
          orderBy: { createdAt: 'desc' },
          select: this.missionVersionScalarSelect,
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    return mission;
  }

  async findMissionVersion(missionId: string, versionId: string) {
    const version = await this.prisma.missionVersion.findFirst({
      where: {
        id: versionId,
        missionId,
      },
      select: {
        ...this.missionVersionWithSlotsSelect,
        mission: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!version) {
      throw new NotFoundException('Mission version not found');
    }

    return version;
  }

  async findMissionVersionSlots(missionId: string, versionId: string) {
    const version = await this.prisma.missionVersion.findFirst({
      where: {
        id: versionId,
        missionId,
      },
      select: {
        id: true,
        missionId: true,
        missionAttackSlots: true,
        missionDefenceSlots: true,
        missionFriendlySlots: true,
      },
    });

    if (!version) {
      throw new NotFoundException('Mission version not found');
    }

    return {
      id: version.id,
      missionId: version.missionId,
      attack: version.missionAttackSlots,
      defense: version.missionDefenceSlots,
      friendly: version.missionFriendlySlots,
    };
  }
}
