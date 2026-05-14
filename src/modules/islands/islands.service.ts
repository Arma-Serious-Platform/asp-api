import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { CreateIslandDto } from './dto/create-island.dto';
import { UpdateIslandDto } from './dto/update-island.dto';
import { FindIslandsDto } from './dto/find-islands.dto';

@Injectable()
export class IslandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: FindIslandsDto) {
    const { take = 100, skip = 0, search } = dto;

    const where: Prisma.IslandWhereInput | undefined = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.island.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      this.prisma.island.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string) {
    const island = await this.prisma.island.findUnique({
      where: { id },
    });

    if (!island) {
      throw new NotFoundException('Island not found');
    }

    return island;
  }

  async create(dto: CreateIslandDto) {
    try {
      return await this.prisma.island.create({
        data: {
          name: dto.name,
          code: dto.code,
        },
      });
    } catch (e) {
      this.rethrowUniqueViolation(e);
      throw e;
    }
  }

  async update(id: string, dto: UpdateIslandDto) {
    await this.ensureExists(id);

    if (dto.name === undefined && dto.code === undefined) {
      throw new BadRequestException('No fields to update');
    }

    const data: Prisma.IslandUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.code !== undefined) data.code = dto.code;

    try {
      return await this.prisma.island.update({
        where: { id },
        data,
      });
    } catch (e) {
      this.rethrowUniqueViolation(e);
      throw e;
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);

    return this.prisma.$transaction(async (tx) => {
      await tx.mission.updateMany({
        where: { islandId: id },
        data: { islandId: null },
      });
      return tx.island.delete({ where: { id } });
    });
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.island.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Island not found');
    }
  }

  private rethrowUniqueViolation(e: unknown) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('An island with this code already exists');
    }
  }
}
