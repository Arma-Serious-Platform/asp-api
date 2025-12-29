import { PrismaService } from "src/infrastructure/prisma/prisma.service";
import { FindMissionsDto } from "./dto/find-missions.dto";
import { CreateMissionDto } from "./dto/create-mission.dto";
import { ASP_BUCKET } from "src/infrastructure/minio/minio.lib";
import { MinioService } from "src/infrastructure/minio/minio.service";
import { CreateMissionVersionDto } from "./dto/create-mission-version.dto";
import { MissionStatus, Prisma, UserRole } from "@prisma/client";
import { UpdateMissionDto } from "./dto/update-mission.dto";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UpdateMissionVersionDto } from "./dto/update-mission-version.dto";
import { FindMissionByIdDto } from "./dto/find-mission-by-id.dto";
import { ChangeMissionVersionStatusDto } from "./dto/change-mission-version-status.dto";

@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService, private readonly minioService: MinioService) { }

  async findAll(dto: FindMissionsDto) {
    const { search, authorId, minSlots, maxSlots, status } = dto;

    const options: Prisma.MissionFindManyArgs = {
      where: {
        name: { contains: search, mode: 'insensitive' },
        ...(authorId ? { authorId } : {}),
        ...(minSlots ? { missionVersions: { some: { attackSideSlots: { gte: minSlots } } } } : {}),
        ...(maxSlots ? { missionVersions: { some: { attackSideSlots: { lte: maxSlots } } } } : {}),
        ...(status ? { missionVersions: { some: { status } } } : {}),
      },
      include: {
        image: true,
        missionVersions: {
          take: 1,
          skip: 0,
          select: {
            id: true,
            attackSideName: true,
            defenseSideName: true,
            attackSideSlots: true,
            defenseSideSlots: true,
            attackSideType: true,
            defenseSideType: true,
            version: true,
            status: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        author: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            squad: {
              select: {
                id: true,
                tag: true,
                side: {
                  select: {
                    id: true,
                    type: true
                  }
                }
              }
            }
          },
        },
      },
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.mission.count({ where: options.where }),
      this.prisma.mission.findMany({
        where: options.where,
        include: options.include,
      }),
    ]);

    return {
      data,
      total,
    };
  }

  async findById(dto: FindMissionByIdDto) {
    return await this.prisma.mission.findUnique({
      where: { id: dto.id },
      include: {
        image: true,
        missionVersions: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            file: true,
            weaponry: true,
          }
        }
      },
    });
  }

  async createMission(dto: CreateMissionDto, authorId: string, image?: File) {
    let fileId: string | null = null;

    if (image) {
      const file = await this.minioService.uploadFile(ASP_BUCKET.MISSION_IMAGES, image);

      fileId = file.id;
    }

    return await this.prisma.mission.create({
      data: {
        name: dto.name,
        description: dto.description,
        authorId: authorId,
        imageId: fileId
      },
      include: {
        image: true
      }
    });
  }

  async updateMission(dto: UpdateMissionDto, missionId: string, authorId: string, image?: File) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
        imageId: true,
        authorId: true,
      }
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (mission.authorId !== authorId) {
      throw new ForbiddenException('You are not the author of this mission');
    }

    let newFileId: string | null = null;

    if (image) {
      const file = await this.minioService.uploadFile(ASP_BUCKET.MISSION_IMAGES, image);

      newFileId = file.id;
    }

    return await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        name: dto.name,
        description: dto.description,
        imageId: newFileId ?? mission.imageId ?? null,
      },
    });
  }

  async createMissionVersion(dto: CreateMissionVersionDto, missionId: string) {
    const { id: fileId } = await this.minioService.uploadFile(ASP_BUCKET.MISSIONS, dto.file);

    return await this.prisma.missionVersion.create({
      data: {
        fileId,
        version: dto.version,
        missionId: missionId,
        attackSideType: dto.attackSideType,
        defenseSideType: dto.defenseSideType,
        attackSideSlots: dto.attackSideSlots,
        defenseSideSlots: dto.defenseSideSlots,
        attackSideName: dto.attackSideName,
        defenseSideName: dto.defenseSideName,
        status: MissionStatus.PENDING_APPROVAL,
        weaponry: dto.weaponry
          ? {
            create: dto.weaponry.map((weaponry) => ({
              name: weaponry.name,
              description: weaponry.description,
              count: weaponry.count,
              type: weaponry.type,
            })),
          }
          : undefined,
      },
      include: {
        weaponry: true,
      },
    });
  }

  async updateMissionVersion(dto: UpdateMissionVersionDto, missionVersionId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isMissionReviewer: true,
      }
    });
    
    if (!user) {
      return new NotFoundException('User not found');
    }

    const missionVersion = await this.prisma.missionVersion.findUnique({
      where: { id: missionVersionId },
      select: {
        id: true,
        attackSideType: true,
        defenseSideType: true,
        mission: {
          select: {
            authorId: true
          }
        }
      },
    });

    if (!missionVersion) {
      return new NotFoundException('Mission version not found');
    }

    const canChangeAnyMissionVersion = user.isMissionReviewer || (user.role === UserRole.OWNER || user.role === UserRole.TECH_ADMIN);

    if (missionVersion.mission.authorId !== userId && !canChangeAnyMissionVersion) {
      throw new ForbiddenException('You are not the author of this mission');
    }

    return await this.prisma.missionVersion.update({
      where: { id: missionVersionId },
      data: {
        version: dto.version,
        attackSideName: dto.attackSideName,
        defenseSideName: dto.defenseSideName,
        attackSideSlots: dto.attackSideSlots,
        defenseSideSlots: dto.defenseSideSlots,
        attackSideType: dto.attackSideType,
        defenseSideType: dto.defenseSideType,
        weaponry: dto.weaponry
          ? {
            deleteMany: {},
            create: dto.weaponry.map((weaponry) => ({
              name: weaponry.name,
              description: weaponry.description,
              count: weaponry.count,
              missionVersionId,
              type: weaponry.type
            })),
          }
          : undefined,
      },
    });
  }

  async changeMissionVersionStatus(dto: ChangeMissionVersionStatusDto, versionId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isMissionReviewer: true,
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isMissionReviewer && (user.role !== UserRole.OWNER && user.role !== UserRole.TECH_ADMIN)) {
      throw new ForbiddenException('You are not authorized to change mission version status');
    }

    return await this.prisma.missionVersion.update({
      where: { id: versionId },
      data: { status: dto.status },
    });
  }
}