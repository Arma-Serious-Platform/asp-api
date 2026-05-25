import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SquadRole } from '@prisma/client';
import { ASP_BUCKET } from 'src/infrastructure/minio/minio.lib';
import { MinioService } from 'src/infrastructure/minio/minio.service';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { CreateSpecializationDto } from './dto/create-specialization.dto';
import { UpdateSpecializationDto } from './dto/update-specialization.dto';

@Injectable()
export class SpecializationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  private readonly includeIcon = {
    icon: {
      select: {
        id: true,
        bucket: true,
        filename: true,
        url: true,
      },
    },
  };

  findAll() {
    return this.prisma.specialization.findMany({
      include: this.includeIcon,
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const specialization = await this.prisma.specialization.findUnique({
      where: { id },
      include: this.includeIcon,
    });

    if (!specialization) {
      throw new NotFoundException('Specialization not found');
    }

    return specialization;
  }

  async create(dto: CreateSpecializationDto, icon?: File) {
    const existing = await this.prisma.specialization.findUnique({
      where: { name: dto.name },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Specialization with this name already exists');
    }

    const uploadedIcon = icon
      ? await this.minioService.uploadFile(ASP_BUCKET.SPECIALIZATION_ICONS, icon)
      : null;

    return this.prisma.specialization.create({
      data: {
        name: dto.name,
        color: dto.color,
        ...(uploadedIcon && { iconId: uploadedIcon.id }),
      },
      include: this.includeIcon,
    });
  }

  async update(id: string, dto: UpdateSpecializationDto, icon?: File) {
    const specialization = await this.prisma.specialization.findUnique({
      where: { id },
      select: {
        id: true,
        iconId: true,
      },
    });

    if (!specialization) {
      throw new NotFoundException('Specialization not found');
    }

    if (dto.name) {
      const existing = await this.prisma.specialization.findFirst({
        where: {
          name: dto.name,
          id: { not: id },
        },
        select: { id: true },
      });

      if (existing) {
        throw new BadRequestException('Specialization with this name already exists');
      }
    }

    const uploadedIcon = icon
      ? await this.minioService.uploadFile(ASP_BUCKET.SPECIALIZATION_ICONS, icon)
      : null;

    const updated = await this.prisma.specialization.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(uploadedIcon && { iconId: uploadedIcon.id }),
      },
      include: this.includeIcon,
    });

    if (uploadedIcon && specialization.iconId) {
      await this.minioService.deleteFile(specialization.iconId);
    }

    return updated;
  }

  async delete(id: string) {
    const specialization = await this.prisma.specialization.findUnique({
      where: { id },
      select: {
        id: true,
        iconId: true,
      },
    });

    if (!specialization) {
      throw new NotFoundException('Specialization not found');
    }

    await this.prisma.specialization.delete({
      where: { id },
    });

    if (specialization.iconId) {
      await this.minioService.deleteFile(specialization.iconId);
    }

    return { id };
  }

  async setUserSpecializations(actorId: string, userId: string, specializationIds: string[]) {
    const manager = await this.prisma.user.findUnique({
      where: { id: actorId },
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

    if (!manager) {
      throw new NotFoundException('User not found');
    }

    if (!manager.squadId || !manager.squad) {
      throw new BadRequestException('You are not in a squad');
    }

    const isLeader = manager.squad.leaderId === manager.id;
    const isSubleader = manager.squadRole === SquadRole.SUBLEADER;

    if (!isLeader && !isSubleader) {
      throw new BadRequestException('You are not allowed to manage this squad');
    }

    const member = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        squadId: true,
      },
    });

    if (!member) {
      throw new NotFoundException('User not found');
    }

    if (member.squadId !== manager.squad.id) {
      throw new BadRequestException('User is not in your squad');
    }

    const specializations = await this.prisma.specialization.findMany({
      where: {
        id: { in: specializationIds },
      },
      select: {
        id: true,
      },
    });

    if (specializations.length !== new Set(specializationIds).size) {
      throw new BadRequestException('Some specializations were not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        specializations: {
          set: specializationIds.map((id) => ({ id })),
        },
      },
      select: {
        id: true,
        nickname: true,
        specializations: {
          include: this.includeIcon,
          orderBy: {
            name: 'asc',
          },
        },
      },
    });
  }
}
