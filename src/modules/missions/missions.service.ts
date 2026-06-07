import { PrismaService } from "src/infrastructure/prisma/prisma.service";
import { FindMissionsDto, MissionOrderBy } from "./dto/find-missions.dto";
import { CreateMissionDto } from "./dto/create-mission.dto";
import { ASP_BUCKET } from "src/infrastructure/minio/minio.lib";
import { MinioService } from "src/infrastructure/minio/minio.service";
import { resolveMissionVersionBucket } from "src/infrastructure/minio/mission-version-bucket";
import { CreateMissionVersionDto } from "./dto/create-mission-version.dto";
import { MissionStatus, MissionType, Prisma, State, UserRole } from "@prisma/client";
import { UpdateMissionDto } from "./dto/update-mission.dto";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UpdateMissionVersionDto } from "./dto/update-mission-version.dto";
import { FindMissionByIdDto } from "./dto/find-mission-by-id.dto";
import { ChangeMissionVersionStatusDto } from "./dto/change-mission-version-status.dto";
import { PboParserService } from "src/infrastructure/pbo-parser/pbo-parser.service";
import { HeadquartersService } from "src/modules/headquarters/headquarters.service";
import { ChangeMissionStateDto } from "./dto/change-mission-state.dto";
import { OrderType } from "src/shared/enums/order-type.enum";

@Injectable()
export class MissionsService {
  private readonly missionAuthorSelect = {
    id: true,
    nickname: true,
    avatar: true,
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
  } satisfies Prisma.UserSelect;

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly pboParserService: PboParserService,
    private readonly headquartersService: HeadquartersService,
  ) { }

  private buildMissionSideSlots(
    slotsBySide: Partial<Record<"BLUE" | "RED" | "GREEN", unknown[]>>,
    sideType: "BLUE" | "RED" | "GREEN",
  ): Prisma.InputJsonValue {
    return {
      [sideType]: slotsBySide[sideType] ?? [],
    } as Prisma.InputJsonObject;
  }

  private normalizeCoauthorIds(coauthorIds: string[] | undefined, authorId: string) {
    if (coauthorIds === undefined) {
      return undefined;
    }

    return [...new Set(coauthorIds)].filter((coauthorId) => coauthorId !== authorId);
  }

  private async ensureCoauthorsExist(coauthorIds: string[]) {
    if (coauthorIds.length === 0) {
      return;
    }

    const existingCoauthors = await this.prisma.user.findMany({
      where: {
        id: { in: coauthorIds },
      },
      select: {
        id: true,
      },
    });
    const existingCoauthorIds = new Set(existingCoauthors.map((coauthor) => coauthor.id));
    const missingCoauthorIds = coauthorIds.filter((coauthorId) => !existingCoauthorIds.has(coauthorId));

    if (missingCoauthorIds.length > 0) {
      throw new BadRequestException(`Coauthors not found: ${missingCoauthorIds.join(', ')}`);
    }
  }

  private canEditMission(
    mission: { authorId: string | null; coauthors: { id: string }[] },
    userId: string,
  ) {
    return mission.authorId === userId || mission.coauthors.some((coauthor) => coauthor.id === userId);
  }

  private canManageAnyMission(role: UserRole) {
    return ([UserRole.OWNER, UserRole.SERVER_ADMIN, UserRole.UVK] as UserRole[]).includes(role);
  }

  private canArchiveAnyMission(role: UserRole) {
    return ([UserRole.OWNER, UserRole.UVK] as UserRole[]).includes(role);
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
    const { search, authorId, minSlots, maxSlots, status, missionType, state, islandId } = dto;
    const orderBy = dto.orderBy ?? MissionOrderBy.CREATED_AT;
    const orderType = dto.orderType ?? OrderType.DESC;

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
      orderBy: {
        [orderBy]: orderType,
      } as Prisma.MissionOrderByWithRelationInput,
      where: {
        name: { contains: search, mode: 'insensitive' },
        ...(authorId ? { OR: [{ authorId }, { coauthors: { some: { id: authorId } } }] } : {}),
        ...(missionIdsWithValidSlots ? { id: { in: missionIdsWithValidSlots } } : {}),
        ...(status ? { missionVersions: { some: { status } } } : {}),
        ...(missionType ? { missionType } : {}),
        ...(state ? { state } : {}),
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
            inGameTime: true,
            weather: true,
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
          select: this.missionAuthorSelect,
        },
        coauthors: {
          select: this.missionAuthorSelect,
        },
      },
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.mission.count({ where: options.where }),
      this.prisma.mission.findMany(options),
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
        author: {
          select: this.missionAuthorSelect,
        },
        coauthors: {
          select: this.missionAuthorSelect,
        },
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
    const coauthorIds = this.normalizeCoauthorIds(dto.coauthorIds, authorId) ?? [];
    await this.ensureCoauthorsExist(coauthorIds);

    let fileId: string | null = null;

    if (image) {
      const file = await this.minioService.uploadFile(ASP_BUCKET.MISSION_IMAGES, image);

      fileId = file.id;
    }

    return await this.prisma.mission.create({
      data: {
        name: dto.name,
        ...(dto.description !== undefined && { description: dto.description }),
        missionType: dto.missionType ?? MissionType.SG,
        authorId: authorId,
        imageId: fileId,
        islandId: dto.islandId,
        ...(coauthorIds.length > 0 && {
          coauthors: {
            connect: coauthorIds.map((id) => ({ id })),
          },
        }),
      },
      include: {
        image: true,
        island: true,
        author: {
          select: this.missionAuthorSelect,
        },
        coauthors: {
          select: this.missionAuthorSelect,
        },
      }
    });
  }

  async updateMission(dto: UpdateMissionDto, missionId: string, authorId: string, image?: File) {
    const user = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
        imageId: true,
        authorId: true,
        coauthors: {
          select: {
            id: true,
          },
        },
      }
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    const canManageAnyMission = this.canManageAnyMission(user.role);

    if (!this.canEditMission(mission, authorId) && !canManageAnyMission) {
      throw new ForbiddenException('You are not the author of this mission');
    }

    const coauthorIds = this.normalizeCoauthorIds(dto.coauthorIds, mission.authorId ?? authorId);
    if (coauthorIds !== undefined) {
      if (mission.authorId !== authorId && !canManageAnyMission) {
        throw new ForbiddenException('Only the mission author can change coauthors');
      }

      await this.ensureCoauthorsExist(coauthorIds);
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
        ...(coauthorIds !== undefined && {
          coauthors: {
            set: coauthorIds.map((id) => ({ id })),
          },
        }),
      },
      include: {
        image: true,
        island: true,
        author: {
          select: this.missionAuthorSelect,
        },
        coauthors: {
          select: this.missionAuthorSelect,
        },
      },
    });
  }

  async changeMissionState(dto: ChangeMissionStateDto, missionId: string, userId: string, role: UserRole) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
        authorId: true,
        coauthors: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (!this.canEditMission(mission, userId) && !this.canArchiveAnyMission(role)) {
      throw new ForbiddenException('You are not authorized to archive this mission');
    }

    return await this.prisma.mission.update({
      where: { id: missionId },
      data: { state: dto.state },
      include: {
        image: true,
        island: true,
        author: {
          select: this.missionAuthorSelect,
        },
        coauthors: {
          select: this.missionAuthorSelect,
        },
      },
    });
  }

  async deleteMission(missionId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!this.canManageAnyMission(user.role)) {
      throw new ForbiddenException(
        'Only owner, server admin or UVK can delete a mission',
      );
    }

    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
        imageId: true,
        missionVersions: {
          select: {
            id: true,
            fileId: true,
            uniformScreenshots: { select: { fileId: true } },
          },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    const versionIds = mission.missionVersions.map((v) => v.id);
    const fileIdsToDelete = new Set<string>();
    if (mission.imageId) {
      fileIdsToDelete.add(mission.imageId);
    }
    for (const v of mission.missionVersions) {
      fileIdsToDelete.add(v.fileId);
      for (const s of v.uniformScreenshots) {
        fileIdsToDelete.add(s.fileId);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.game.deleteMany({ where: { missionId } });

      while ((await tx.missionComment.count({ where: { missionId } })) > 0) {
        const { count } = await tx.missionComment.deleteMany({
          where: {
            missionId,
            replies: { none: {} },
          },
        });
        if (count === 0) {
          throw new BadRequestException(
            'Unable to delete mission comments (unexpected structure)',
          );
        }
      }

      if (versionIds.length > 0) {
        await tx.missionWeaponry.deleteMany({
          where: { missionVersionId: { in: versionIds } },
        });
        await tx.missionVersionScreenshot.deleteMany({
          where: { missionVersionId: { in: versionIds } },
        });
        await tx.missionVersion.deleteMany({ where: { missionId } });
      }

      await tx.mission.delete({ where: { id: missionId } });
    });

    for (const fileId of fileIdsToDelete) {
      await this.minioService.deleteFile(fileId);
    }

    return { id: missionId };
  }

  async createMissionVersion(
    dto: CreateMissionVersionDto,
    missionId: string,
    userId: string,
    attackScreenshots: File[] = [],
    defenseScreenshots: File[] = [],
  ) {
    if (!dto.file) {
      throw new BadRequestException("Mission file is required");
    }

    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      select: {
        authorId: true,
        missionType: true,
        state: true,
        coauthors: {
          select: {
            id: true,
          },
        },
      },
    });
    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    if (mission.state === State.ARCHIVED) {
      throw new BadRequestException('Cannot add a version to an archived mission');
    }

    if (!this.canEditMission(mission, userId)) {
      throw new ForbiddenException('You are not the author of this mission');
    }

    const slotsBySide = await this.pboParserService.parseMissionSlots(dto.file);
    const missionAttackSlots = this.buildMissionSideSlots(slotsBySide, dto.attackSideType);
    const missionDefenceSlots = this.buildMissionSideSlots(slotsBySide, dto.defenseSideType);

    const versionBucket = resolveMissionVersionBucket(
      MissionStatus.PENDING_APPROVAL,
      mission.missionType,
    );
    const { id: fileId } = await this.minioService.uploadFile(versionBucket, dto.file);
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
        ...(dto.inGameTime !== undefined && { inGameTime: new Date(dto.inGameTime) }),
        ...(dto.weather !== undefined && { weather: dto.weather }),
        ...(dto.changelog !== undefined && { changelog: dto.changelog }),
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
        file: {
          select: {
            bucket: true,
            filename: true,
          },
        },
        uniformScreenshots: {
          select: {
            id: true,
            fileId: true,
            side: true,
          },
        },
        mission: {
          select: {
            authorId: true,
            missionType: true,
            state: true,
            coauthors: {
              select: {
                id: true,
              },
            },
          }
        }
      }
    });

    if (!missionVersion) {
      throw new NotFoundException('Mission version not found');
    }

    if (missionVersion.mission.state === State.ARCHIVED) {
      throw new BadRequestException('Cannot update a version of an archived mission');
    }

    const canChangeAnyMissionVersion =
      user.isMissionReviewer ||
      this.canManageAnyMission(user.role);

    if (!this.canEditMission(missionVersion.mission, userId) && !canChangeAnyMissionVersion) {
      throw new ForbiddenException('You are not the author of this mission');
    }

    const updateDto: Prisma.MissionVersionUpdateInput = {};

    let previousFileId: string | undefined;
    let shouldDeletePreviousFileObject = true;
    const uploadedScreenshotFileIdsToRollback: string[] = [];
    const fileIdsToDeleteAfterUpdate: string[] = [];

    if (file) {
      const slotsBySide = await this.pboParserService.parseMissionSlots(file);
      updateDto.missionAttackSlots = this.buildMissionSideSlots(slotsBySide, dto.attackSideType ?? missionVersion.attackSideType);
      updateDto.missionDefenceSlots = this.buildMissionSideSlots(slotsBySide, dto.defenseSideType ?? missionVersion.defenseSideType);

      const versionBucket = resolveMissionVersionBucket(
        MissionStatus.PENDING_APPROVAL,
        missionVersion.mission.missionType,
      );
      const newFile = await this.minioService.uploadFile(versionBucket, file);
      previousFileId = missionVersion.fileId;
      shouldDeletePreviousFileObject =
        missionVersion.file.bucket !== newFile.bucket ||
        missionVersion.file.filename !== newFile.filename;
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

    if (dto.inGameTime !== undefined) {
      updateDto.inGameTime = new Date(dto.inGameTime);
    }

    if (dto.weather !== undefined) {
      updateDto.weather = dto.weather;
    }

    if (dto.changelog !== undefined) {
      updateDto.changelog = dto.changelog;
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

    const effectiveAttackSideType = dto.attackSideType ?? missionVersion.attackSideType;
    const effectiveDefenseSideType = dto.defenseSideType ?? missionVersion.defenseSideType;

    const removeAttackIdsSet = new Set(dto.removeAttackScreenshotIds ?? []);
    const removeDefenseIdsSet = new Set(dto.removeDefenseScreenshotIds ?? []);
    const removeIds = new Set([...removeAttackIdsSet, ...removeDefenseIdsSet]);

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
        side: effectiveAttackSideType,
      })),
      ...uploadedDefenseScreenshots.map((screenshot) => ({
        fileId: screenshot.id,
        side: effectiveDefenseSideType,
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
        if (shouldDeletePreviousFileObject) {
          await this.minioService.deleteFile(previousFileId);
        } else {
          await this.minioService.deleteFileRecord(previousFileId);
        }
      }

      for (const fileIdToDelete of fileIdsToDeleteAfterUpdate) {
        await this.minioService.deleteFile(fileIdToDelete);
      }

      if (file) {
        await this.headquartersService.resetGamePlanSlotsForMissionVersion(missionVersionId);
      }

      return updated;
    } catch (error) {
      for (const uploadedFileId of uploadedScreenshotFileIdsToRollback) {
        await this.minioService.deleteFile(uploadedFileId);
      }
      throw error;
    }
  }

  async deleteMissionVersion(missionId: string, missionVersionId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!this.canManageAnyMission(user.role)) {
      throw new ForbiddenException('Only owner, server admin or UVK can delete a mission version');
    }

    const missionVersion = await this.prisma.missionVersion.findUnique({
      where: { id: missionVersionId },
      select: {
        id: true,
        missionId: true,
        fileId: true,
        uniformScreenshots: {
          select: {
            fileId: true,
          },
        },
      },
    });

    if (!missionVersion || missionVersion.missionId !== missionId) {
      throw new NotFoundException('Mission version not found');
    }

    const fileIdsToDelete = new Set<string>([missionVersion.fileId]);
    for (const screenshot of missionVersion.uniformScreenshots) {
      fileIdsToDelete.add(screenshot.fileId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.game.deleteMany({
        where: { missionVersionId },
      });

      await tx.missionWeaponry.deleteMany({
        where: { missionVersionId },
      });

      await tx.missionVersionScreenshot.deleteMany({
        where: { missionVersionId },
      });

      await tx.missionVersion.delete({
        where: { id: missionVersionId },
      });
    });

    for (const fileId of fileIdsToDelete) {
      await this.minioService.deleteFile(fileId);
    }

    return { id: missionVersionId };
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

    if (!user.isMissionReviewer && !this.canManageAnyMission(user.role)) {
      throw new ForbiddenException('You are not authorized to change mission version status');
    }

    const version = await this.prisma.missionVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        fileId: true,
        mission: { select: { missionType: true } },
      },
    });

    if (!version) {
      throw new NotFoundException('Mission version not found');
    }

    const targetBucket = resolveMissionVersionBucket(
      dto.status,
      version.mission.missionType,
    );
    await this.minioService.moveFileToBucket(version.fileId, targetBucket);

    return await this.prisma.missionVersion.update({
      where: { id: versionId },
      data: { status: dto.status },
      include: {
        file: true,
      },
    });
  }
}
