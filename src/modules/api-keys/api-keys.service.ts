import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { generateApiKey, hashApiKey } from './api-key.utils';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly publicSelect = {
    id: true,
    name: true,
    keyPrefix: true,
    lastUsedAt: true,
    createdAt: true,
    updatedAt: true,
    createdBy: {
      select: {
        id: true,
        nickname: true,
        roles: true,
        squadRole: true,
        squad: {
          select: {
            id: true,
            name: true,
            tag: true,
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
    },
  } as const;

  findAll() {
    return this.prisma.apiKey.findMany({
      select: this.publicSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateApiKeyDto, createdById: string) {
    const { key, keyPrefix, keyHash } = generateApiKey();

    const created = await this.prisma.apiKey.create({
      data: {
        name: dto.name.trim(),
        keyPrefix,
        keyHash,
        createdById,
      },
      select: this.publicSelect,
    });

    return {
      ...created,
      key,
    };
  }

  async update(id: string, dto: UpdateApiKeyDto) {
    const existing = await this.prisma.apiKey.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    return this.prisma.apiKey.update({
      where: { id },
      data: {
        name: dto.name.trim(),
      },
      select: this.publicSelect,
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.apiKey.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.delete({ where: { id } });
    return { id };
  }

  async findByRawKey(rawKey: string) {
    const keyHash = hashApiKey(rawKey);
    return this.prisma.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        name: true,
        keyHash: true,
      },
    });
  }

  touchLastUsed(id: string) {
    return this.prisma.apiKey.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }
}
