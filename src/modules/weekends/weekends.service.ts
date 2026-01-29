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
              mission: {
                include: {
                  image: true,
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
            mission: {
              include: {
                image: true,
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

    // Validate that all missions and sides exist
    const missionIds = [...new Set(dto.games.map((game) => game.missionId))];
    const sideIds = [
      ...new Set([
        ...dto.games.map((game) => game.attackSideId),
        ...dto.games.map((game) => game.defenseSideId),
      ]),
    ];

    const [missions, sides] = await Promise.all([
      this.prisma.mission.findMany({
        where: { id: { in: missionIds } },
        select: { id: true },
      }),
      this.prisma.side.findMany({
        where: { id: { in: sideIds } },
        select: { id: true },
      }),
    ]);

    const foundMissionIds = new Set(missions.map((m) => m.id));
    const foundSideIds = new Set(sides.map((s) => s.id));

    const missingMissions = missionIds.filter((id) => !foundMissionIds.has(id));
    const missingSides = sideIds.filter((id) => !foundSideIds.has(id));

    if (missingMissions.length > 0) {
      throw new BadRequestException(
        `Missions not found: ${missingMissions.join(', ')}`,
      );
    }

    if (missingSides.length > 0) {
      throw new BadRequestException(
        `Sides not found: ${missingSides.join(', ')}`,
      );
    }

    return await this.prisma.weekend.create({
      data: {
        name: dto.name,
        description: dto.description,
        ...(dto.published !== undefined && { published: dto.published }),
        ...(dto.publishedAt !== undefined && { publishedAt: new Date(dto.publishedAt) }),
        games: {
          create: dto.games.map((game) => ({
            name: game.name,
            date: new Date(game.date),
            position: game.position,
            missionId: game.missionId,
            attackSideId: game.attackSideId,
            defenseSideId: game.defenseSideId,
          })),
        },
      },
      include: {
        games: {
          include: {
            mission: {
              include: {
                image: true,
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
            mission: {
              include: {
                image: true,
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

    // Validate missions and sides if they are being updated
    if (dto.missionId) {
      const mission = await this.prisma.mission.findUnique({
        where: { id: dto.missionId },
        select: { id: true },
      });
      if (!mission) {
        throw new BadRequestException(`Mission not found: ${dto.missionId}`);
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

    if (dto.missionId !== undefined) {
      updateData.mission = {
        connect: { id: dto.missionId },
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

    return await this.prisma.game.update({
      where: { id: gameId },
      data: updateData,
      include: {
        mission: {
          include: {
            image: true,
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
