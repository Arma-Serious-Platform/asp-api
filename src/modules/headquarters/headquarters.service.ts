import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/infrastructure/prisma/prisma.service";
import { MissionGameSide, Prisma, SideType, SquadRole, UserRole } from "@prisma/client";
import { UpdateGamePlanDto } from "./dto/update-game-plan.dto";
import { UpdateGamePlanSlotDto } from "./dto/update-game-plan-slot.dto";
import { AssignSlotSquadDto } from "./dto/assign-slot-squad.dto";
import { CreateGamePlanCommentDto } from "./dto/create-game-plan-comment.dto";
import { UpdateGamePlanCommentDto } from "./dto/update-game-plan-comment.dto";
import { FindGamePlanCommentsDto } from "./dto/find-game-plan-comments.dto";
import { HeadquartersGateway } from "./headquarters.gateway";

/** PBO slot unit names often look like: `1. Role@Callsign | gear | gear`. */
function parseSlotUnitDisplayName(raw: string): {
  name: string;
  weaponry?: string;
} {
  let s = raw.trim();
  if (!s) {
    return { name: raw };
  }

  s = s.replace(/^\d+\.\s*/, "");
  s = s.replace(/\s*"@[^"]*"\s*/g, " ");
  s = s.replace(/\s*@[^|]+\s*/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  const parts = s.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { name: raw.trim() };
  }
  if (parts.length === 1) {
    return { name: parts[0]! };
  }
  return {
    name: parts[0]!,
    weaponry: parts.slice(1).join(", "),
  };
}

const DEFAULT_CALLSIGNS = [
  'Alpha 1-1', 'Alpha 1-2', 'Alpha 1-3', 'Alpha 1-4', 'Alpha 1-5', 'Alpha 1-6',
  'Alpha 2-1', 'Alpha 2-2', 'Alpha 2-3', 'Alpha 2-4', 'Alpha 2-5', 'Alpha 2-6',
  'Alpha 3-1', 'Alpha 3-2', 'Alpha 3-3', 'Alpha 3-4', 'Alpha 3-5', 'Alpha 3-6',
  'Alpha 4-1', 'Alpha 4-2', 'Alpha 4-3', 'Alpha 4-4', 'Alpha 4-5', 'Alpha 4-6',
  'Alpha 5-1', 'Alpha 5-2', 'Alpha 5-3', 'Alpha 5-4', 'Alpha 5-5', 'Alpha 5-6',
];

type ParsedMissionUnit = {
  name?: string;
};

type ParsedMissionSlot = {
  callsign?: string;
  count?: number;
  units?: ParsedMissionUnit[];
};

@Injectable()
export class HeadquartersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly headquartersGateway: HeadquartersGateway,
  ) {}

  async ensureGamePlansForGame(gameId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;

    const game = await db.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        attackSideId: true,
        defenseSideId: true,
        missionVersion: {
          select: {
            missionAttackSlots: true,
            missionDefenceSlots: true,
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const sides = await db.side.findMany({
      where: {
        type: { in: [SideType.BLUE, SideType.RED] },
      },
      select: {
        id: true,
      },
    });

    for (const side of sides) {
      const existingPlan = await db.gamePlan.findUnique({
        where: {
          gameId_sideId: {
            gameId,
            sideId: side.id,
          },
        },
        select: { id: true },
      });

      if (existingPlan) {
        continue;
      }

      const gamePlan = await db.gamePlan.create({
        data: {
          gameId,
          sideId: side.id,
        },
        select: { id: true },
      });

      const rows = this.buildGamePlanSlotRows(game, side.id, gamePlan.id);
      await db.gamePlanSlot.createMany({ data: rows });
    }
  }

  /**
   * Rebuilds HQ slots from the current game sides/mission and clears commander + plan URL.
   * Use when attack/defense sides change on a game.
   */
  async resetGamePlansForGame(gameId: string) {
    const affectedPlanIds = await this.rebuildGamePlanSlotsForGame(gameId);

    if (affectedPlanIds.length > 0) {
      await this.prisma.gamePlan.updateMany({
        where: { id: { in: affectedPlanIds } },
        data: {
          gameCommanderId: null,
          planUrl: null,
        },
      });
    }

    await this.emitGamePlanUpdates(affectedPlanIds);
  }

  /**
   * Rebuilds all HQ slot rows from the mission version JSON for every game that uses this version.
   * Clears squad–slot links (implicit M2M); squads are not deleted.
   */
  async resetGamePlanSlotsForMissionVersion(missionVersionId: string) {
    const games = await this.prisma.game.findMany({
      where: { missionVersionId },
      select: { id: true },
    });

    const affectedPlanIds: string[] = [];
    for (const game of games) {
      const planIds = await this.rebuildGamePlanSlotsForGame(game.id);
      affectedPlanIds.push(...planIds);
    }

    await this.emitGamePlanUpdates(affectedPlanIds);
  }

  private async rebuildGamePlanSlotsForGame(gameId: string): Promise<string[]> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        attackSideId: true,
        defenseSideId: true,
        missionVersion: {
          select: {
            missionAttackSlots: true,
            missionDefenceSlots: true,
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    await this.ensureGamePlansForGame(gameId);

    const plans = await this.prisma.gamePlan.findMany({
      where: {
        gameId: game.id,
        side: { type: { in: [SideType.BLUE, SideType.RED] } },
      },
      select: { id: true, sideId: true },
    });

    const affectedPlanIds: string[] = [];

    for (const plan of plans) {
      const rows = this.buildGamePlanSlotRows(game, plan.sideId, plan.id);
      await this.prisma.$transaction([
        this.prisma.gamePlanSlot.deleteMany({ where: { gamePlanId: plan.id } }),
        this.prisma.gamePlanSlot.createMany({ data: rows }),
      ]);
      affectedPlanIds.push(plan.id);
    }

    return affectedPlanIds;
  }

  private async emitGamePlanUpdates(planIds: string[]) {
    for (const planId of new Set(planIds)) {
      const updated = await this.prisma.gamePlan.findUnique({
        where: { id: planId },
        include: this.gamePlanInclude,
      });
      if (updated) {
        this.headquartersGateway.emitGamePlanUpdated(planId, updated);
      }
    }
  }

  private buildGamePlanSlotRows(
    game: {
      attackSideId: string;
      defenseSideId: string;
      missionVersion: {
        missionAttackSlots: Prisma.JsonValue | null;
        missionDefenceSlots: Prisma.JsonValue | null;
      };
    },
    sideId: string,
    gamePlanId: string,
  ): Prisma.GamePlanSlotCreateManyInput[] {
    const missionSlotsForSide = this.getMissionSlotsForGameSide(game, sideId);
    const hasMissionSlots = missionSlotsForSide.length > 0;

    if (hasMissionSlots) {
      return missionSlotsForSide.map((slot) => {
        const rawUnitName = slot.units?.[0]?.name;
        const parsed = rawUnitName
          ? parseSlotUnitDisplayName(rawUnitName)
          : null;
        return {
          gamePlanId,
          slotNumber: slot.callsign ?? 'Unknown',
          ...(parsed
            ? {
                name: parsed.name,
                ...(parsed.weaponry ? { weaponry: parsed.weaponry } : {}),
              }
            : {}),
          ...(slot.count !== undefined ? { slotCount: slot.count } : {}),
        };
      });
    }

    return DEFAULT_CALLSIGNS.map((slotNumber) => ({
      gamePlanId,
      slotNumber,
    }));
  }

  private getMissionSlotsForGameSide(
    game: {
      attackSideId: string;
      defenseSideId: string;
      missionVersion: {
        missionAttackSlots: Prisma.JsonValue | null;
        missionDefenceSlots: Prisma.JsonValue | null;
      };
    },
    sideId: string,
  ): ParsedMissionSlot[] {
    if (sideId === game.attackSideId) {
      return this.extractSlotsArrayBySide(game.missionVersion.missionAttackSlots);
    }

    if (sideId === game.defenseSideId) {
      return this.extractSlotsArrayBySide(game.missionVersion.missionDefenceSlots);
    }

    return [];
  }

  private extractSlotsArrayBySide(slotsJson: Prisma.JsonValue | null): ParsedMissionSlot[] {
    if (!slotsJson || typeof slotsJson !== 'object' || Array.isArray(slotsJson)) {
      return [];
    }

    for (const side of [MissionGameSide.BLUE, MissionGameSide.RED, MissionGameSide.GREEN]) {
      const slots = (slotsJson as Record<string, unknown>)[side];
      if (!Array.isArray(slots)) {
        continue;
      }

      return slots.filter((slot): slot is ParsedMissionSlot => typeof slot === 'object' && slot !== null);
    }

    return [];
  }

  async findPlansByGame(gameId: string, userId: string) {
    const sideId = await this.getAllowedSideIdForUser(userId);
    return this.prisma.gamePlan.findMany({
      where: {
        gameId,
        sideId,
        ...this.publishedWeekendPlanWhere,
      },
      include: this.gamePlanInclude,
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findPlanById(id: string, userId: string) {
    const sideId = await this.getAllowedSideIdForUser(userId);
    const gamePlan = await this.prisma.gamePlan.findFirst({
      where: {
        id,
        sideId,
        ...this.publishedWeekendPlanWhere,
      },
      include: this.gamePlanInclude,
    });

    if (!gamePlan) {
      throw new NotFoundException('Game plan not found');
    }

    return gamePlan;
  }

  async updatePlan(id: string, dto: UpdateGamePlanDto, userId: string) {
    const gamePlan = await this.getGamePlanWithSide(id);
    await this.ensureUserCanAccessHeadquartersForSide(userId, gamePlan.sideId);

    const updatedPlan = await this.prisma.gamePlan.update({
      where: { id },
      data: {
        ...(dto.planUrl !== undefined && { planUrl: dto.planUrl }),
      },
      include: this.gamePlanInclude,
    });

    this.headquartersGateway.emitGamePlanUpdated(id, updatedPlan);
    return updatedPlan;
  }

  async assignCommander(id: string, userId: string) {
    const gamePlan = await this.getGamePlanWithSide(id);
    await this.ensureUserCanAccessHeadquartersForSide(userId, gamePlan.sideId);

    const updatedPlan = await this.prisma.gamePlan.update({
      where: { id },
      data: { gameCommanderId: userId },
      include: this.gamePlanInclude,
    });

    this.headquartersGateway.emitGamePlanUpdated(id, updatedPlan);
    this.headquartersGateway.emitCommanderChanged(id, updatedPlan);
    return updatedPlan;
  }

  async unassignCommander(id: string, userId: string, role: UserRole) {
    const gamePlan = await this.getGamePlanWithSide(id);

    const superAdminRoles = new Set<UserRole>([UserRole.OWNER, UserRole.SERVER_ADMIN, UserRole.UVK]);
    const isSuperAdmin = superAdminRoles.has(role);
    const isCurrentCommander = gamePlan.gameCommanderId === userId;

    if (!isSuperAdmin) {
      await this.ensureUserCanAccessHeadquartersForSide(userId, gamePlan.sideId);
    }

    if (!isCurrentCommander && !isSuperAdmin) {
      throw new ForbiddenException('Only current commander or super admin can unassign commander');
    }

    const updatedPlan = await this.prisma.gamePlan.update({
      where: { id },
      data: { gameCommanderId: null },
      include: this.gamePlanInclude,
    });

    this.headquartersGateway.emitGamePlanUpdated(id, updatedPlan);
    this.headquartersGateway.emitCommanderChanged(id, updatedPlan);
    return updatedPlan;
  }

  async updateSlot(slotId: string, dto: UpdateGamePlanSlotDto, userId: string) {
    const slot = await this.getSlotWithPlan(slotId);
    await this.ensureIsCommander(slot.gamePlanId, userId);

    const updatedSlot = await this.prisma.gamePlanSlot.update({
      where: { id: slotId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.weaponry !== undefined && { weaponry: dto.weaponry }),
        ...(dto.slotCount !== undefined && { slotCount: dto.slotCount }),
        ...(dto.comment !== undefined && { comment: dto.comment }),
        ...(dto.spawnPoint !== undefined && { spawnPoint: dto.spawnPoint }),
      },
      include: this.slotInclude,
    });

    this.headquartersGateway.emitSlotUpdated(slot.gamePlanId, updatedSlot);
    return updatedSlot;
  }

  async assignSquadToSlot(slotId: string, dto: AssignSlotSquadDto, userId: string) {
    const slot = await this.getSlotWithPlan(slotId);
    await this.ensureIsCommander(slot.gamePlanId, userId);
    await this.ensureSquadInSameSide(dto.squadId, slot.gamePlan.sideId);

    const updatedSlot = await this.prisma.gamePlanSlot.update({
      where: { id: slotId },
      data: {
        assignedSquads: {
          connect: { id: dto.squadId },
        },
      },
      include: this.slotInclude,
    });

    this.headquartersGateway.emitSlotUpdated(slot.gamePlanId, updatedSlot);
    return updatedSlot;
  }

  async unassignSquadFromSlot(slotId: string, dto: AssignSlotSquadDto, userId: string) {
    const slot = await this.getSlotWithPlan(slotId);
    await this.ensureIsCommander(slot.gamePlanId, userId);

    const updatedSlot = await this.prisma.gamePlanSlot.update({
      where: { id: slotId },
      data: {
        assignedSquads: {
          disconnect: { id: dto.squadId },
        },
      },
      include: this.slotInclude,
    });

    this.headquartersGateway.emitSlotUpdated(slot.gamePlanId, updatedSlot);
    return updatedSlot;
  }

  async assignMySquadAsWanted(slotId: string, userId: string) {
    const slot = await this.getSlotWithPlan(slotId);
    const me = await this.ensureUserCanAccessHeadquartersForSide(userId, slot.gamePlan.sideId);
    const squadId = me.squadId;

    if (!squadId) {
      throw new BadRequestException('You are not in a squad');
    }

    const updatedSlot = await this.prisma.gamePlanSlot.update({
      where: { id: slotId },
      data: {
        wantedSquads: {
          connect: { id: squadId },
        },
      },
      include: this.slotInclude,
    });

    this.headquartersGateway.emitSlotUpdated(slot.gamePlanId, updatedSlot);
    return updatedSlot;
  }

  async unassignMySquadAsWanted(slotId: string, userId: string) {
    const slot = await this.getSlotWithPlan(slotId);
    const me = await this.ensureUserCanAccessHeadquartersForSide(userId, slot.gamePlan.sideId);
    const squadId = me.squadId;

    if (!squadId) {
      throw new BadRequestException('You are not in a squad');
    }

    const updatedSlot = await this.prisma.gamePlanSlot.update({
      where: { id: slotId },
      data: {
        wantedSquads: {
          disconnect: { id: squadId },
        },
      },
      include: this.slotInclude,
    });

    this.headquartersGateway.emitSlotUpdated(slot.gamePlanId, updatedSlot);
    return updatedSlot;
  }

  async findComments(gamePlanId: string, dto: FindGamePlanCommentsDto, userId: string) {
    const gamePlan = await this.getGamePlanWithSide(gamePlanId);
    await this.ensureUserCanAccessHeadquartersForSide(userId, gamePlan.sideId);
    const { replyId, skip = 0, take = 100 } = dto;

    const where: Prisma.GamePlanCommentWhereInput = { gamePlanId };
    if (replyId !== undefined) {
      where.replyId = replyId;
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.gamePlanComment.count({ where }),
      this.prisma.gamePlanComment.findMany({
        where,
        skip,
        take,
        include: this.commentInclude,
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

  async createComment(gamePlanId: string, dto: CreateGamePlanCommentDto, userId: string) {
    const gamePlan = await this.getGamePlanWithSide(gamePlanId);
    await this.ensureUserCanAccessHeadquartersForSide(userId, gamePlan.sideId);

    let replyId: string | undefined;
    if (dto.replyId !== undefined) {
      const replyTo = await this.prisma.gamePlanComment.findUnique({
        where: { id: dto.replyId },
      });
      if (!replyTo) {
        throw new NotFoundException('Reply-to comment not found');
      }
      if (replyTo.gamePlanId !== gamePlanId) {
        throw new BadRequestException('Reply must be to a comment in the same game plan');
      }
      replyId = dto.replyId;
    }

    const comment = await this.prisma.gamePlanComment.create({
      data: {
        gamePlanId,
        userId,
        message: dto.message,
        ...(replyId && { replyId }),
      },
      include: this.commentInclude,
    });

    this.headquartersGateway.emitCommentCreated(gamePlanId, comment);
    return comment;
  }

  async updateComment(commentId: string, dto: UpdateGamePlanCommentDto, userId: string) {
    const comment = await this.prisma.gamePlanComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        userId: true,
        gamePlanId: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    const updateData: { message?: Prisma.InputJsonValue; replyId?: string | null } = {};

    if (dto.message !== undefined) {
      updateData.message = dto.message as Prisma.InputJsonValue;
    }

    if (dto.replyId !== undefined) {
      if (dto.replyId === null) {
        updateData.replyId = null;
      } else {
        const replyTo = await this.prisma.gamePlanComment.findUnique({
          where: { id: dto.replyId },
        });
        if (!replyTo) {
          throw new NotFoundException('Reply-to comment not found');
        }
        if (replyTo.gamePlanId !== comment.gamePlanId) {
          throw new BadRequestException('Reply must be to a comment in the same game plan');
        }
        updateData.replyId = dto.replyId;
      }
    }

    const updatedComment = await this.prisma.gamePlanComment.update({
      where: { id: commentId },
      data: updateData,
      include: this.commentInclude,
    });

    this.headquartersGateway.emitCommentUpdated(comment.gamePlanId, updatedComment);
    return updatedComment;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.gamePlanComment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, gamePlanId: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.gamePlanComment.delete({
      where: { id: commentId },
    });

    this.headquartersGateway.emitCommentDeleted(comment.gamePlanId, commentId);

    return { message: 'Comment deleted successfully' };
  }

  private readonly slotInclude = {
    assignedSquads: {
      select: {
        id: true,
        name: true,
        tag: true,
      },
    },
    wantedSquads: {
      select: {
        id: true,
        name: true,
        tag: true,
      },
    },
  } satisfies Prisma.GamePlanSlotInclude;

  private readonly gamePlanInclude = {
    game: {
      include: {
        weekend: {
          select: {
            id: true,
            name: true,
            published: true,
            publishedAt: true,
          },
        },
        mission: {
          select: {
            id: true,
            name: true,
            description: true,
            image: {
              select: {
                id: true,
                url: true,
              },
            },
          },
        },
        missionVersion: {
          select: {
            id: true,
            version: true,
            status: true,
            attackSideType: true,
            defenseSideType: true,
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
    },
    side: {
      select: {
        id: true,
        name: true,
        type: true,
      },
    },
    gameCommander: {
      select: {
        id: true,
        nickname: true,
        avatar: {
          select: {
            id: true,
            url: true,
          },
        },
      },
    },
    slots: {
      include: this.slotInclude,
      orderBy: {
        slotNumber: 'asc',
      },
    },
  } satisfies Prisma.GamePlanInclude;

  private readonly commentInclude = {
    user: {
      select: {
        id: true,
        nickname: true,
        role: true,
        avatar: {
          select: {
            id: true,
            url: true,
          },
        },
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
    replyTo: {
      select: {
        id: true,
        userId: true,
        message: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            nickname: true,
            role: true,
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
      },
    },
  } satisfies Prisma.GamePlanCommentInclude;

  private async getGamePlanWithSide(id: string) {
    const gamePlan = await this.prisma.gamePlan.findUnique({
      where: { id },
      select: {
        id: true,
        sideId: true,
        gameCommanderId: true,
      },
    });

    if (!gamePlan) {
      throw new NotFoundException('Game plan not found');
    }

    return gamePlan;
  }

  private async getSlotWithPlan(slotId: string) {
    const slot = await this.prisma.gamePlanSlot.findUnique({
      where: { id: slotId },
      include: {
        gamePlan: {
          select: {
            id: true,
            sideId: true,
            gameCommanderId: true,
          },
        },
      },
    });

    if (!slot) {
      throw new NotFoundException('Game plan slot not found');
    }

    return slot;
  }

  private async ensureIsCommander(gamePlanId: string, userId: string) {
    const gamePlan = await this.getGamePlanWithSide(gamePlanId);
    await this.ensureUserCanAccessHeadquartersForSide(userId, gamePlan.sideId);

    if (gamePlan.gameCommanderId !== userId) {
      throw new ForbiddenException('Only game commander can perform this action');
    }
  }

  private async ensureSquadInSameSide(squadId: string, sideId: string) {
    const squad = await this.prisma.squad.findUnique({
      where: { id: squadId },
      select: {
        id: true,
        sideId: true,
      },
    });

    if (!squad) {
      throw new NotFoundException('Squad not found');
    }

    if (squad.sideId !== sideId) {
      throw new BadRequestException('Squad side does not match game plan side');
    }
  }

  private async getUserWithHeadquartersSquad(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        squadRole: true,
        squadId: true,
        squad: {
          select: {
            leaderId: true,
            sideId: true,
            side: {
              select: {
                type: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async ensureUserCanAccessHeadquartersForSide(userId: string, sideId: string) {
    const user = await this.getUserWithHeadquartersSquad(userId);

    if (!user.squadId || !user.squad?.sideId) {
      throw new BadRequestException('You are not in a squad');
    }

    const allowedTypes = new Set<SideType>([SideType.BLUE, SideType.RED]);
    if (!allowedTypes.has(user.squad.side.type)) {
      throw new ForbiddenException('Your side is not eligible for headquarters plans');
    }

    if (user.squad.sideId !== sideId) {
      throw new ForbiddenException('Your squad side does not match game plan side');
    }

    const hasSquadPlanAccess =
      user.squad.leaderId === user.id ||
      user.squadRole === SquadRole.SUBLEADER ||
      user.squadRole === SquadRole.HQ;

    if (!hasSquadPlanAccess) {
      throw new ForbiddenException('Your squad role does not allow headquarters plan access');
    }

    return user;
  }

  private readonly publishedWeekendPlanWhere = {
    game: {
      weekend: {
        published: true,
      },
    },
  } satisfies Prisma.GamePlanWhereInput;

  private async getAllowedSideIdForUser(userId: string) {
    const user = await this.getUserWithHeadquartersSquad(userId);

    if (!user.squadId || !user.squad?.sideId) {
      throw new ForbiddenException('You are not a member of a squad');
    }

    await this.ensureUserCanAccessHeadquartersForSide(userId, user.squad.sideId);

    return user.squad.sideId;
  }
}
