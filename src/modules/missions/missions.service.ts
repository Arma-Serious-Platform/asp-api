import { PrismaService } from "src/infrastructure/prisma/prisma.service";
import { FindMissionsDto } from "./dto/find-missions.dto";
import { CreateMissionDto } from "./dto/create-mission.dto";
import { ASP_BUCKET } from "src/infrastructure/minio/minio.lib";
import { MinioService } from "src/infrastructure/minio/minio.service";
import { CreateMissionVersionDto } from "./dto/create-mission-version.dto";
import { MissionStatus, MissionType, Prisma, UserRole } from "@prisma/client";
import { UpdateMissionDto } from "./dto/update-mission.dto";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UpdateMissionVersionDto } from "./dto/update-mission-version.dto";
import { FindMissionByIdDto } from "./dto/find-mission-by-id.dto";
import { ChangeMissionVersionStatusDto } from "./dto/change-mission-version-status.dto";
import { PboParserService } from "src/infrastructure/pbo-parser/pbo-parser.service";

@Injectable()
export class MissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly pboParserService: PboParserService,
  ) { }

  private buildMissionSideSlots(
    slotsBySide: Partial<Record<"BLUE" | "RED" | "GREEN", unknown[]>>,
    sideType: "BLUE" | "RED" | "GREEN",
  ): Prisma.InputJsonValue {
    return {
      [sideType]: slotsBySide[sideType] ?? [],
    } as Prisma.InputJsonObject;
  }

  async findAllIslands() {
    return await this.prisma.island.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        // createdAt: true,
        // updatedAt: true
      }
    });
  }

  async findAll(dto: FindMissionsDto) {
    const { search, authorId, minSlots, maxSlots, status, missionType, islandId } = dto;

    // Get mission IDs that match slot criteria using raw SQL
    let missionIdsWithValidSlots: string[] | null = null;
    if (minSlots || maxSlots) {
      if (minSlots && maxSlots) {
        const result = await this.prisma.$queryRaw<Array<{ missionId: string }>>`
          SELECT DISTINCT "missionId"
          FROM "MissionVersion"
          WHERE ("attackSideSlots" + "defenseSideSlots") >= ${minSlots}
            AND ("attackSideSlots" + "defenseSideSlots") <= ${maxSlots}
        `;
        missionIdsWithValidSlots = result.map((r) => r.missionId);
      } else if (minSlots) {
        const result = await this.prisma.$queryRaw<Array<{ missionId: string }>>`
          SELECT DISTINCT "missionId"
          FROM "MissionVersion"
          WHERE ("attackSideSlots" + "defenseSideSlots") >= ${minSlots}
        `;
        missionIdsWithValidSlots = result.map((r) => r.missionId);
      } else if (maxSlots) {
        const result = await this.prisma.$queryRaw<Array<{ missionId: string }>>`
          SELECT DISTINCT "missionId"
          FROM "MissionVersion"
          WHERE ("attackSideSlots" + "defenseSideSlots") <= ${maxSlots}
        `;
        missionIdsWithValidSlots = result.map((r) => r.missionId);
      }
      
      // If no missions match the slot criteria, return empty result
      if (missionIdsWithValidSlots && missionIdsWithValidSlots.length === 0) {
        return {
          data: [],
          total: 0,
        };
      }
    }

    const options: Prisma.MissionFindManyArgs = {
      where: {
        name: { contains: search, mode: 'insensitive' },
        ...(authorId ? { authorId } : {}),
        ...(missionIdsWithValidSlots ? { id: { in: missionIdsWithValidSlots } } : {}),
        ...(status ? { missionVersions: { some: { status } } } : {}),
        ...(missionType ? { missionType } : {}),
        ...(islandId ? { islandId } : {}),
      },
      include: {
        image: true,
        island: {
          select :{
            id: true,
            name: true,
            code: true,  
          },
        },
        missionVersions: {
          take: 1,
          skip: 0,
          select: {
            id: true,
            attackSideName: true,
            defenseSideName: true,
            attackSideSlots: true,
            defenseSideSlots: true,
            missionAttackSlots: true,
            missionDefenceSlots: true,
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
        island: true,
        missionVersions: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            file: true,
            weaponry: true,
            uniformScreenshots: {
              include: {
                file: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
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
        missionType: dto.missionType ?? MissionType.SG,
        authorId: authorId,
        imageId: fileId,
        islandId: dto.islandId,
      },
      include: {
        image: true,
        island: true,
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
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.missionType !== undefined && { missionType: dto.missionType }),
        ...(dto.islandId !== undefined && { islandId: dto.islandId }),
        ...(newFileId !== null && { imageId: newFileId }),
      },
    });
  }

  async createMissionVersion(
    dto: CreateMissionVersionDto,
    missionId: string,
    attackScreenshots: File[] = [],
    defenseScreenshots: File[] = [],
  ) {
    if (!dto.file) {
      throw new BadRequestException("Mission file is required");
    }

    const slotsBySide = await this.pboParserService.parseMissionSlots(dto.file);
    const missionAttackSlots = this.buildMissionSideSlots(slotsBySide, dto.attackSideType);
    const missionDefenceSlots = this.buildMissionSideSlots(slotsBySide, dto.defenseSideType);

    const { id: fileId } = await this.minioService.uploadFile(ASP_BUCKET.MISSIONS, dto.file);
    const uploadedAttackScreenshots = await Promise.all(
      attackScreenshots.map((screenshot) => this.minioService.uploadFile(ASP_BUCKET.MISSION_IMAGES, screenshot)),
    );
    const uploadedDefenseScreenshots = await Promise.all(
      defenseScreenshots.map((screenshot) => this.minioService.uploadFile(ASP_BUCKET.MISSION_IMAGES, screenshot)),
    );

    return await this.prisma.missionVersion.create({
      data: {
        fileId,
        version: dto.version,
        missionId: missionId,
        attackSideType: dto.attackSideType,
        defenseSideType: dto.defenseSideType,
        attackSideSlots: dto.attackSideSlots,
        defenseSideSlots: dto.defenseSideSlots,
        missionAttackSlots,
        missionDefenceSlots,
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
        uniformScreenshots: (uploadedAttackScreenshots.length > 0 || uploadedDefenseScreenshots.length > 0) ? {
          create: [
            ...uploadedAttackScreenshots.map((screenshot) => ({
              fileId: screenshot.id,
              side: dto.attackSideType,
            })),
            ...uploadedDefenseScreenshots.map((screenshot) => ({
              fileId: screenshot.id,
              side: dto.defenseSideType,
            })),
          ],
        } : undefined,
      },
      include: {
        weaponry: true,
        uniformScreenshots: {
          include: {
            file: true,
          },
        },
      },
    });
  }

  async updateMissionVersion(
    dto: UpdateMissionVersionDto,
    missionVersionId: string,
    userId: string,
    file?: File,
    attackScreenshots: File[] = [],
    defenseScreenshots: File[] = [],
  ) {
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

    const missionVersion = await this.prisma.missionVersion.findUnique({
      where: { id: missionVersionId },
      include: {
        uniformScreenshots: {
          select: {
            id: true,
            fileId: true,
            side: true,
          },
        },
        mission: {
          select: {
            authorId: true
          }
        }
      }
    });

    if (!missionVersion) {
      throw new NotFoundException('Mission version not found');
    }

    const canChangeAnyMissionVersion = user.isMissionReviewer || (user.role === UserRole.OWNER || user.role === UserRole.TECH_ADMIN);

    if (missionVersion.mission.authorId !== userId && !canChangeAnyMissionVersion) {
      throw new ForbiddenException('You are not the author of this mission');
    }

    const updateDto: Prisma.MissionVersionUpdateInput = {};

    let previousFileId: string | undefined;
    const uploadedScreenshotFileIdsToRollback: string[] = [];
    const fileIdsToDeleteAfterUpdate: string[] = [];

    if (file) {
      const slotsBySide = await this.pboParserService.parseMissionSlots(file);
      updateDto.missionAttackSlots = this.buildMissionSideSlots(slotsBySide, dto.attackSideType ?? missionVersion.attackSideType);
      updateDto.missionDefenceSlots = this.buildMissionSideSlots(slotsBySide, dto.defenseSideType ?? missionVersion.defenseSideType);

      const newFile = await this.minioService.uploadFile(ASP_BUCKET.MISSIONS, file);
      previousFileId = missionVersion.fileId;
      updateDto.file = { connect: { id: newFile.id } };

      updateDto.status = MissionStatus.PENDING_APPROVAL;
    }


    if (dto.version !== undefined) {
      updateDto.version = dto.version;
    }

    if (dto.attackSideName !== undefined) {
      updateDto.attackSideName = dto.attackSideName;
    }

    if (dto.defenseSideName !== undefined) {
      updateDto.defenseSideName = dto.defenseSideName;
    }

    if (dto.attackSideSlots !== undefined) {
      updateDto.attackSideSlots = dto.attackSideSlots;
    }

    if (dto.defenseSideSlots !== undefined) {
      updateDto.defenseSideSlots = dto.defenseSideSlots;
    }

    if (dto.attackSideType !== undefined) {
      updateDto.attackSideType = dto.attackSideType;
    }

    if (dto.defenseSideType !== undefined) {
      updateDto.defenseSideType = dto.defenseSideType;
    }

    if (dto.weaponry !== undefined) {
      updateDto.weaponry = {
        deleteMany: {},
        create: dto.weaponry.map((weaponry) => ({
          name: weaponry.name,
          description: weaponry.description,
          count: weaponry.count,
          type: weaponry.type,
        })),
      };
    }

    const removeAttackIdsSet = new Set(dto.removeAttackScreenshotIds ?? []);
    const removeDefenseIdsSet = new Set(dto.removeDefenseScreenshotIds ?? []);
    const removeIds = new Set([...removeAttackIdsSet, ...removeDefenseIdsSet]);

    for (const screenshot of missionVersion.uniformScreenshots) {
      if (removeAttackIdsSet.has(screenshot.id) && screenshot.side !== missionVersion.attackSideType) {
        throw new BadRequestException(`Screenshot ${screenshot.id} does not belong to attack side`);
      }

      if (removeDefenseIdsSet.has(screenshot.id) && screenshot.side !== missionVersion.defenseSideType) {
        throw new BadRequestException(`Screenshot ${screenshot.id} does not belong to defense side`);
      }
    }

    const screenshotsToRemove = missionVersion.uniformScreenshots.filter((screenshot) => removeIds.has(screenshot.id));
    const removeScreenshotsInput = screenshotsToRemove.length > 0 ? {
      deleteMany: {
        id: {
          in: screenshotsToRemove.map((screenshot) => screenshot.id),
        },
      },
    } : undefined;

    if (removeIds.size > screenshotsToRemove.length) {
      throw new BadRequestException('Some screenshots to remove were not found on this mission version');
    }

    const uploadedAttackScreenshots = await Promise.all(
      attackScreenshots.map((screenshot) => this.minioService.uploadFile(ASP_BUCKET.MISSION_IMAGES, screenshot)),
    );
    uploadedScreenshotFileIdsToRollback.push(...uploadedAttackScreenshots.map((screenshot) => screenshot.id));

    const uploadedDefenseScreenshots = await Promise.all(
      defenseScreenshots.map((screenshot) => this.minioService.uploadFile(ASP_BUCKET.MISSION_IMAGES, screenshot)),
    );
    uploadedScreenshotFileIdsToRollback.push(...uploadedDefenseScreenshots.map((screenshot) => screenshot.id));

    const createScreenshotsInput = [
      ...uploadedAttackScreenshots.map((screenshot) => ({
        fileId: screenshot.id,
        side: missionVersion.attackSideType,
      })),
      ...uploadedDefenseScreenshots.map((screenshot) => ({
        fileId: screenshot.id,
        side: missionVersion.defenseSideType,
      })),
    ];

    if (removeScreenshotsInput || createScreenshotsInput.length > 0) {
      updateDto.uniformScreenshots = {
        ...(removeScreenshotsInput ?? {}),
        ...(createScreenshotsInput.length > 0 ? { create: createScreenshotsInput } : {}),
      };
      updateDto.status = MissionStatus.PENDING_APPROVAL;
      fileIdsToDeleteAfterUpdate.push(...screenshotsToRemove.map((screenshot) => screenshot.fileId));
    }

    try {
      const updated = await this.prisma.missionVersion.update({
        where: { id: missionVersionId },
        data: updateDto,
        include: {
          uniformScreenshots: {
            include: {
              file: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (previousFileId) {
        await this.minioService.deleteFile(previousFileId);
      }

      for (const fileIdToDelete of fileIdsToDeleteAfterUpdate) {
        await this.minioService.deleteFile(fileIdToDelete);
      }

      return updated;
    } catch (error) {
      for (const uploadedFileId of uploadedScreenshotFileIdsToRollback) {
        await this.minioService.deleteFile(uploadedFileId);
      }
      throw error;
    }
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