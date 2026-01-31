import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "src/infrastructure/prisma/prisma.service";
import { CreateWeekendDto } from "./dto/create-weekend.dto";
import { UpdateWeekendDto } from "./dto/update-weekend.dto";
import { FindWeekendsDto } from "./dto/find-weekends.dto";
import { UpdateGameDto } from "./dto/update-game.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class WeekendsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: FindWeekendsDto) {
    const { search, skip = 0, take = 100, published } = dto;

    const where: Prisma.WeekendWhereInput = {
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(published !== undefined && { published }),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.weekend.count({ where }),
      this.prisma.weekend.findMany({
        where,
        skip,
        take,
        include: {
          games: {
            include: {
              missionVersion: {
                include: {
                  file: {
                    select: {
                      id: true,
                      url: true,
                    }
                  },
                  mission: {
                    select: {
                      name: true,
                      description: true,
                      image: true,
                    },
                  },
                },
              },
              attackSide: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
              defenseSide: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: [{ position: 'asc' }, { date: 'asc' }],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      data,
      total,
    };
  }

  async findById(id: string) {
    const weekend = await this.prisma.weekend.findUnique({
      where: { id },
      include: {
        games: {
          include: {
            missionVersion: {
              include: {
                mission: {
                  select: {
                    name: true,
                    description: true,
                    image: true,
                  },
                },
              },
            },
            attackSide: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            defenseSide: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: [{ position: 'asc' }, { date: 'asc' }],
        },
      },
    });

    if (!weekend) {
      throw new NotFoundException('Weekend not found');
    }

    return weekend;
  }

  async create(dto: CreateWeekendDto) {
    if (!dto.games || dto.games.length === 0) {
      throw new BadRequestException('At least one game is required to create a weekend');
    }

    // Validate mission versions exist and each version belongs to the selected mission
    const missionVersionIds = [...new Set(dto.games.map((g) => g.missionVersionId))];
    const sideIds = [
      ...new Set([
        ...dto.games.map((game) => game.attackSideId),
        ...dto.games.map((game) => game.defenseSideId),
      ]),
    ];

    const [missionVersions, sides] = await Promise.all([
      this.prisma.missionVersion.findMany({
        where: { id: { in: missionVersionIds } },
        select: { id: true, missionId: true },
      }),
      this.prisma.side.findMany({
        where: { id: { in: sideIds } },
        select: { id: true },
      }),
    ]);

    const versionById = new Map(missionVersions.map((v) => [v.id, v]));
    const foundSideIds = new Set(sides.map((s) => s.id));

    const missingVersionIds = missionVersionIds.filter((id) => !versionById.has(id));
    if (missingVersionIds.length > 0) {
      throw new BadRequestException(
        `Mission versions not found: ${missingVersionIds.join(', ')}`,
      );
    }

    for (const game of dto.games) {
      const version = versionById.get(game.missionVersionId);
      if (version && version.missionId !== game.missionId) {
        throw new BadRequestException(
          `Mission version ${game.missionVersionId} does not belong to mission ${game.missionId}`,
        );
      }
    }

    const missingSides = sideIds.filter((id) => !foundSideIds.has(id));
    if (missingSides.length > 0) {
      throw new BadRequestException(
        `Sides not found: ${missingSides.join(', ')}`,
      );
    }

    const adminIds = [...new Set(dto.games.map((g) => g.adminId).filter((id): id is string => id != null))];
    if (adminIds.length > 0) {
      const admins = await this.prisma.user.findMany({
        where: { id: { in: adminIds } },
        select: { id: true },
      });
      const foundAdminIds = new Set(admins.map((u) => u.id));
      const missingAdminIds = adminIds.filter((id) => !foundAdminIds.has(id));
      if (missingAdminIds.length > 0) {
        throw new BadRequestException(
          `Admin users not found: ${missingAdminIds.join(', ')}`,
        );
      }
    }

    return await this.prisma.weekend.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        ...(dto.published !== undefined && { published: dto.published }),
        ...(dto.publishedAt !== undefined && { publishedAt: new Date(dto.publishedAt) }),
        games: {
          create: dto.games.map((game) => ({
            name: game.name,
            date: new Date(game.date),
            position: game.position,
            missionId: game.missionId,
            missionVersionId: game.missionVersionId,
            attackSideId: game.attackSideId,
            defenseSideId: game.defenseSideId,
            ...(game.adminId != null && { adminId: game.adminId }),
          })),
        },
      },
      include: {
        games: {
          include: {
            missionVersion: {
              include: {
                mission: {
                  select: {
                    name: true,
                    description: true,
                    image: true,
                  },
                },
              },
            },
            attackSide: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            defenseSide: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: [{ position: 'asc' }, { date: 'asc' }],
        },
      },
    });
  }

  async update(id: string, dto: UpdateWeekendDto) {
    const weekend = await this.prisma.weekend.findUnique({
      where: { id },
    });

    if (!weekend) {
      throw new NotFoundException('Weekend not found');
    }

    return await this.prisma.weekend.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.published !== undefined && { published: dto.published }),
        ...(dto.publishedAt !== undefined && { publishedAt: new Date(dto.publishedAt) }),
      },
      include: {
        games: {
          include: {
            missionVersion: {
              include: {
                mission: {
                  select: {
                    name: true,
                    description: true,
                    image: true,
                  },
                },
              },
            },
            attackSide: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            defenseSide: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: [{ position: 'asc' }, { date: 'asc' }],
        },
      },
    });
  }

  async delete(id: string) {
    const weekend = await this.prisma.weekend.findUnique({
      where: { id },
      include: {
        games: {
          select: { id: true },
        },
      },
    });

    if (!weekend) {
      throw new NotFoundException('Weekend not found');
    }

    // Delete all related games first (cascade delete)
    if (weekend.games.length > 0) {
      await this.prisma.game.deleteMany({
        where: { weekendId: id },
      });
    }

    // Then delete the weekend
    await this.prisma.weekend.delete({
      where: { id },
    });

    return { message: 'Weekend and related games deleted successfully' };
  }

  async updateGame(gameId: string, dto: UpdateGameDto) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Validate mission version belongs to mission when updating mission/version
    if (dto.missionVersionId !== undefined || dto.missionId !== undefined) {
      if (dto.missionId === undefined || dto.missionVersionId === undefined) {
        throw new BadRequestException(
          'When changing mission or version, both missionId and missionVersionId must be provided',
        );
      }
      const missionVersion = await this.prisma.missionVersion.findUnique({
        where: { id: dto.missionVersionId },
        select: { id: true, missionId: true },
      });
      if (!missionVersion) {
        throw new BadRequestException(`Mission version not found: ${dto.missionVersionId}`);
      }
      if (missionVersion.missionId !== dto.missionId) {
        throw new BadRequestException(
          `Mission version ${dto.missionVersionId} does not belong to mission ${dto.missionId}`,
        );
      }
    }

    if (dto.attackSideId) {
      const attackSide = await this.prisma.side.findUnique({
        where: { id: dto.attackSideId },
        select: { id: true },
      });
      if (!attackSide) {
        throw new BadRequestException(`Attack side not found: ${dto.attackSideId}`);
      }
    }

    if (dto.defenseSideId) {
      const defenseSide = await this.prisma.side.findUnique({
        where: { id: dto.defenseSideId },
        select: { id: true },
      });
      if (!defenseSide) {
        throw new BadRequestException(`Defense side not found: ${dto.defenseSideId}`);
      }
    }

    const updateData: Prisma.GameUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.date !== undefined) {
      updateData.date = new Date(dto.date);
    }

    if (dto.missionId !== undefined && dto.missionVersionId !== undefined) {
      updateData.mission = {
        connect: { id: dto.missionId },
      };
      updateData.missionVersion = {
        connect: { id: dto.missionVersionId },
      };
    }

    if (dto.attackSideId !== undefined) {
      updateData.attackSide = {
        connect: { id: dto.attackSideId },
      };
    }

    if (dto.defenseSideId !== undefined) {
      updateData.defenseSide = {
        connect: { id: dto.defenseSideId },
      };
    }

    if (dto.position !== undefined) {
      updateData.position = dto.position;
    }

    if (dto.adminId !== undefined) {
      if (dto.adminId === null) {
        updateData.admin = { disconnect: true };
      } else {
        const admin = await this.prisma.user.findUnique({
          where: { id: dto.adminId },
          select: { id: true },
        });
        if (!admin) {
          throw new BadRequestException(`Admin user not found: ${dto.adminId}`);
        }
        updateData.admin = { connect: { id: dto.adminId } };
      }
    }

    return await this.prisma.game.update({
      where: { id: gameId },
      data: updateData,
      include: {
        missionVersion: {
          include: {
            mission: {
              select: {
                name: true,
                description: true,
                image: true,
              },
            },
          },
        },
        attackSide: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        defenseSide: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        weekend: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async deleteGame(gameId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        weekend: {
          select: {
            id: true,
            games: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    // Check if this is the last game in the weekend
    if (game.weekend.games.length === 1) {
      throw new BadRequestException('Cannot delete the last game in a weekend. Delete the weekend instead.');
    }

    await this.prisma.game.delete({
      where: { id: gameId },
    });

    return { message: 'Game deleted successfully' };
  }
}
