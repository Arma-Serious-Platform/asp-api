import { PrismaService } from "src/infrastructure/prisma/prisma.service";
import { FindMissionsDto } from "./dto/find-missions.dto";
import { CreateMissionDto } from "./dto/create-mission.dto";
import { ASP_BUCKET } from "src/infrastructure/minio/minio.lib";
import { MinioService } from "src/infrastructure/minio/minio.service";
import { CreateMissionVersionDto } from "./dto/create-mission-version.dto";
import { MissionStatus, Prisma } from "@prisma/client";
import { UpdateMissionDto } from "./dto/update-mission.dto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { UpdateMissionVersionDto } from "./dto/update-mission-version.dto";
import { FindMissionByIdDto } from "./dto/find-mission-by-id.dto";

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
          include: {
            file: true,
            attackSideWeaponry: true,
            defenseSideWeaponry: true
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

  async updateMission(dto: UpdateMissionDto, missionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        imageId: true,
      }
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    let newFileId: string | null = null;

    if (dto.image) {
      const file = await this.minioService.uploadFile(ASP_BUCKET.MISSION_IMAGES, dto.image);

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
        attackSideWeaponry: dto.attackSideWeaponry
          ? {
            create: dto.attackSideWeaponry.map((weaponry) => ({
              name: weaponry.name,
              description: weaponry.description,
              count: weaponry.count,
            })),
          }
          : undefined,
        defenseSideWeaponry: dto.defenseSideWeaponry
          ? {
            create: dto.defenseSideWeaponry.map((weaponry) => ({
              name: weaponry.name,
              description: weaponry.description,
              count: weaponry.count,
            })),
          }
          : undefined,
      },
      include: {
        attackSideWeaponry: true,
        defenseSideWeaponry: true,
      },
    });
  }

  async updateMissionVersion(dto: UpdateMissionVersionDto, missionVersionId: string) {
    return await this.prisma.missionVersion.update({
      where: { id: missionVersionId },
      data: {
        version: dto.version,
        attackSideName: dto.attackSideName,
        defenseSideName: dto.defenseSideName,
        attackSideSlots: dto.attackSideSlots,
        defenseSideSlots: dto.defenseSideSlots,
        attackSideType: dto.attackSideType
      },
    });
  }
}