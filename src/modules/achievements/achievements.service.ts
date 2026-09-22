import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Multer } from 'multer';
import { ASP_BUCKET } from 'src/infrastructure/minio/minio.lib';
import { MinioService } from 'src/infrastructure/minio/minio.service';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { hasAnyRole } from 'src/shared/utils/user-roles';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';

const MANAGE_ROLES: UserRole[] = [UserRole.OWNER, UserRole.SERVER_ADMIN];

@Injectable()
export class AchievementsService {
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
    return this.prisma.achievement.findMany({
      include: this.includeIcon,
      orderBy: {
        title: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const achievement = await this.prisma.achievement.findUnique({
      where: { id },
      include: this.includeIcon,
    });

    if (!achievement) {
      throw new NotFoundException('Achievement not found');
    }

    return achievement;
  }

  async create(dto: CreateAchievementDto, icon?: Multer.File) {
    if (!icon) {
      throw new BadRequestException('Icon is required');
    }

    const existing = await this.prisma.achievement.findUnique({
      where: { title: dto.title.trim() },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Achievement with this title already exists');
    }

    const uploadedIcon = await this.minioService.uploadFile(ASP_BUCKET.ACHIEVEMENT_ICONS, icon);

    return this.prisma.achievement.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        iconId: uploadedIcon.id,
      },
      include: this.includeIcon,
    });
  }

  async update(id: string, dto: UpdateAchievementDto, icon?: Multer.File) {
    const achievement = await this.prisma.achievement.findUnique({
      where: { id },
      select: {
        id: true,
        iconId: true,
      },
    });

    if (!achievement) {
      throw new NotFoundException('Achievement not found');
    }

    if (dto.title !== undefined) {
      const title = dto.title.trim();
      const existing = await this.prisma.achievement.findFirst({
        where: {
          title,
          id: { not: id },
        },
        select: { id: true },
      });

      if (existing) {
        throw new BadRequestException('Achievement with this title already exists');
      }
    }

    const uploadedIcon = icon
      ? await this.minioService.uploadFile(ASP_BUCKET.ACHIEVEMENT_ICONS, icon)
      : null;

    const updated = await this.prisma.achievement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description.trim() }),
        ...(uploadedIcon && { iconId: uploadedIcon.id }),
      },
      include: this.includeIcon,
    });

    if (uploadedIcon && achievement.iconId) {
      await this.minioService.deleteFile(achievement.iconId);
    }

    return updated;
  }

  async delete(id: string) {
    const achievement = await this.prisma.achievement.findUnique({
      where: { id },
      select: {
        id: true,
        iconId: true,
      },
    });

    if (!achievement) {
      throw new NotFoundException('Achievement not found');
    }

    await this.prisma.achievement.delete({
      where: { id },
    });

    if (achievement.iconId) {
      await this.minioService.deleteFile(achievement.iconId);
    }

    return { id };
  }

  async setUserAchievements(actorId: string, userId: string, achievementIds: string[]) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: {
        id: true,
        roles: true,
      },
    });

    if (!actor) {
      throw new NotFoundException('User not found');
    }

    if (!hasAnyRole(actor.roles, MANAGE_ROLES)) {
      throw new ForbiddenException();
    }

    const member = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('User not found');
    }

    const uniqueIds = [...new Set(achievementIds)];
    const achievements = await this.prisma.achievement.findMany({
      where: {
        id: { in: uniqueIds },
      },
      select: {
        id: true,
      },
    });

    if (achievements.length !== uniqueIds.length) {
      throw new BadRequestException('Some achievements were not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        achievements: {
          set: uniqueIds.map((id) => ({ id })),
        },
      },
      select: {
        id: true,
        nickname: true,
        achievements: {
          include: this.includeIcon,
          orderBy: {
            title: 'asc',
          },
        },
      },
    });
  }
}
