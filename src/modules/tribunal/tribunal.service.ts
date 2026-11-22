import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TribunalComplaintStatus,
  TribunalPunishmentKind,
  UserRole,
} from '@prisma/client';
import { Multer } from 'multer';
import { MinioService } from 'src/infrastructure/minio/minio.service';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { commentUserSelect } from 'src/shared/utils/comment-user-select';
import { uploadAttachmentFiles } from 'src/shared/utils/upload-attachments';
import { hasAnyRole } from 'src/shared/utils/user-roles';
import { UsersService } from '../users/users.service';
import {
  CreateTribunalComplaintDto,
  TribunalPunishmentDto,
  TribunalPunishmentRequestType,
} from './dto/create-tribunal-complaint.dto';
import { AssignTribunalComplaintDto } from './dto/assign-tribunal-complaint.dto';
import { FindTribunalComplaintsDto } from './dto/find-tribunal-complaints.dto';
import { SetTribunalRuleDto } from './dto/set-tribunal-rule.dto';
import { CreateTribunalMessageDto } from './dto/create-tribunal-message.dto';
import {
  ResolveTribunalComplaintDto,
  TribunalResolveOutcome,
} from './dto/resolve-tribunal-complaint.dto';

const TRIBUNAL_ADMIN_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.SERVER_ADMIN,
  UserRole.GAME_ADMIN,
];

const PERMANENT_BAN_ROLES: UserRole[] = [UserRole.OWNER, UserRole.SERVER_ADMIN];

const userSelect = commentUserSelect;

type TribunalUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;

const OPEN_COMPLAINT_STATUSES: TribunalComplaintStatus[] = [
  TribunalComplaintStatus.OPEN,
  TribunalComplaintStatus.IN_PROGRESS,
];

const complaintListInclude = {
  author: { select: userSelect },
  target: { select: userSelect },
  assignee: { select: userSelect },
  resolvedBy: { select: userSelect },
  game: {
    select: {
      id: true,
      date: true,
      mission: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  _count: {
    select: {
      messages: true,
    },
  },
} satisfies Prisma.TribunalComplaintInclude;

const complaintInclude = {
  ...complaintListInclude,
  attachments: {
    include: {
      file: {
        select: {
          id: true,
          url: true,
          filename: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.TribunalComplaintInclude;

@Injectable()
export class TribunalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly minioService: MinioService,
  ) {}

  async findAll(query: FindTribunalComplaintsDto) {
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.authorId ? { authorId: query.authorId } : {}),
      ...(query.targetUserId ? { targetUserId: query.targetUserId } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.tribunalComplaint.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: complaintListInclude,
      }),
      this.prisma.tribunalComplaint.count({ where }),
    ]);

    return { items, total };
  }

  async findFilters() {
    const [authors, targets, assignees] = await Promise.all([
      this.prisma.tribunalComplaint.groupBy({ by: ['authorId'] }),
      this.prisma.tribunalComplaint.groupBy({ by: ['targetUserId'] }),
      this.prisma.tribunalComplaint.groupBy({ by: ['assigneeId'] }),
    ]);
    const assigneeIds = assignees
      .map((row) => row.assigneeId)
      .filter((id): id is string => Boolean(id));
    const ids = [
      ...new Set([
        ...authors.map((row) => row.authorId),
        ...targets.map((row) => row.targetUserId),
        ...assigneeIds,
      ]),
    ];
    const users = ids.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: userSelect,
        })
      : [];
    const byId = new Map(users.map((user) => [user.id, user]));
    const pick = (userIds: string[]) =>
      userIds
        .map((id) => byId.get(id))
        .filter((user): user is TribunalUser => Boolean(user))
        .sort((left, right) => left.nickname.localeCompare(right.nickname, 'uk'));

    return {
      authors: pick(authors.map((row) => row.authorId)),
      targets: pick(targets.map((row) => row.targetUserId)),
      assignees: pick(assigneeIds),
    };
  }

  async findGames() {
    const games = await this.prisma.game.findMany({
      orderBy: { date: 'desc' },
      take: 40,
      select: {
        id: true,
        date: true,
        mission: {
          select: {
            name: true,
          },
        },
      },
    });

    return games.map((game) => ({
      id: game.id,
      date: game.date,
      missionName: game.mission.name,
    }));
  }

  async findOne(id: string, userId: string, roles: UserRole[]) {
    const complaint = await this.prisma.tribunalComplaint.findUnique({
      where: { id },
      include: {
        ...complaintInclude,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: userSelect },
          },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException('Скаргу не знайдено');
    }

    return complaint;
  }

  async create(
    dto: CreateTribunalComplaintDto,
    userId: string,
    roles: UserRole[],
  ) {
    if (dto.targetUserId === userId) {
      throw new BadRequestException('Не можна подати скаргу на себе');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: dto.targetUserId },
      select: { id: true },
    });

    if (!target) {
      throw new NotFoundException('Користувача не знайдено');
    }

    const violatedAt = new Date(dto.violatedAt);

    if (Number.isNaN(violatedAt.getTime())) {
      throw new BadRequestException('Некоректна дата порушення');
    }

    if (violatedAt.getTime() > Date.now()) {
      throw new BadRequestException('Дата порушення не може бути в майбутньому');
    }

    if (dto.gameId) {
      const game = await this.prisma.game.findUnique({
        where: { id: dto.gameId },
        select: { id: true },
      });

      if (!game) {
        throw new NotFoundException('Гру не знайдено');
      }
    }

    const isAdmin = hasAnyRole(roles, TRIBUNAL_ADMIN_ROLES);
    const ruleNumber = isAdmin ? dto.ruleNumber?.trim() || null : null;
    const ruleText = isAdmin ? dto.ruleText?.trim() || null : null;

    return this.prisma.tribunalComplaint.create({
      data: {
        authorId: userId,
        targetUserId: target.id,
        ruleNumber,
        ruleText,
        violatedAt,
        gameId: dto.gameId,
        description: dto.description.trim(),
        status: TribunalComplaintStatus.OPEN,
        punishmentKind: TribunalPunishmentKind.NONE,
      },
      include: complaintInclude,
    });
  }

  async createMessage(
    complaintId: string,
    dto: CreateTribunalMessageDto,
    userId: string,
    roles: UserRole[],
  ) {
    const complaint = await this.prisma.tribunalComplaint.findUnique({
      where: { id: complaintId },
      select: { id: true, authorId: true, targetUserId: true, status: true },
    });

    if (!complaint) {
      throw new NotFoundException('Скаргу не знайдено');
    }

    if (
      complaint.status !== TribunalComplaintStatus.OPEN &&
      complaint.status !== TribunalComplaintStatus.IN_PROGRESS
    ) {
      throw new BadRequestException('У закритій скарзі писати не можна');
    }

    this.ensureCanWrite(complaint, userId, roles);

    const body = dto.body.trim();

    if (!body) {
      throw new BadRequestException('Повідомлення не може бути порожнім');
    }

    return this.prisma.tribunalMessage.create({
      data: {
        complaintId,
        authorId: userId,
        body,
      },
      include: {
        author: { select: userSelect },
      },
    });
  }

  async deleteMessage(complaintId: string, messageId: string, roles: UserRole[]) {
    if (!hasAnyRole(roles, TRIBUNAL_ADMIN_ROLES)) {
      throw new ForbiddenException('Видаляти повідомлення може лише адміністрація');
    }

    const message = await this.prisma.tribunalMessage.findUnique({
      where: { id: messageId },
      select: { id: true, complaintId: true },
    });

    if (!message || message.complaintId !== complaintId) {
      throw new NotFoundException('Повідомлення не знайдено');
    }

    await this.prisma.tribunalMessage.delete({
      where: { id: messageId },
    });

    return { id: messageId };
  }

  async findAdmins() {
    return this.prisma.user.findMany({
      where: {
        roles: { hasSome: TRIBUNAL_ADMIN_ROLES },
        status: 'ACTIVE',
      },
      select: userSelect,
      orderBy: { nickname: 'asc' },
    });
  }

  async setRule(
    complaintId: string,
    dto: SetTribunalRuleDto,
    userId: string,
    roles: UserRole[],
  ) {
    if (!hasAnyRole(roles, TRIBUNAL_ADMIN_ROLES)) {
      throw new ForbiddenException('Правило може визначити лише адміністрація');
    }

    const complaint = await this.prisma.tribunalComplaint.findUnique({
      where: { id: complaintId },
      select: { id: true, status: true },
    });

    if (!complaint) {
      throw new NotFoundException('Скаргу не знайдено');
    }

    if (
      complaint.status !== TribunalComplaintStatus.OPEN &&
      complaint.status !== TribunalComplaintStatus.IN_PROGRESS
    ) {
      throw new BadRequestException('На закритій скарзі правило змінити не можна');
    }

    await this.prisma.tribunalComplaint.update({
      where: { id: complaintId },
      data: {
        ruleNumber: dto.ruleNumber.trim(),
        ruleText: dto.ruleText.trim(),
      },
    });

    return this.findOne(complaintId, userId, roles);
  }

  async addAttachments(
    complaintId: string,
    files: Multer.File[],
    userId: string,
    roles: UserRole[],
  ) {
    const complaint = await this.prisma.tribunalComplaint.findUnique({
      where: { id: complaintId },
      select: {
        id: true,
        authorId: true,
        targetUserId: true,
        status: true,
        _count: { select: { attachments: true } },
      },
    });

    if (!complaint) {
      throw new NotFoundException('Скаргу не знайдено');
    }

    this.ensureCanWrite(complaint, userId, roles);

    if (
      complaint.status !== TribunalComplaintStatus.OPEN &&
      complaint.status !== TribunalComplaintStatus.IN_PROGRESS
    ) {
      throw new BadRequestException('До закритої скарги файли додати не можна');
    }

    if (complaint._count.attachments + files.length > 10) {
      throw new BadRequestException('До скарги можна додати не більше 10 файлів');
    }

    const uploaded = await uploadAttachmentFiles(this.minioService, files);

    if (uploaded.length) {
      await this.prisma.tribunalComplaintAttachment.createMany({
        data: uploaded.map((file) => ({
          complaintId,
          fileId: file.fileId,
          originalName: file.originalName,
          mimeType: file.mimeType,
        })),
      });
    }

    return this.findOne(complaintId, userId, roles);
  }

  async assign(
    complaintId: string,
    dto: AssignTribunalComplaintDto,
    userId: string,
    roles: UserRole[],
  ) {
    if (!hasAnyRole(roles, TRIBUNAL_ADMIN_ROLES)) {
      throw new ForbiddenException('Призначати скаргу може лише адміністрація');
    }

    const complaint = await this.prisma.tribunalComplaint.findUnique({
      where: { id: complaintId },
      select: { id: true, status: true },
    });

    if (!complaint) {
      throw new NotFoundException('Скаргу не знайдено');
    }

    if (
      complaint.status !== TribunalComplaintStatus.OPEN &&
      complaint.status !== TribunalComplaintStatus.IN_PROGRESS
    ) {
      throw new BadRequestException('Закриту скаргу не можна перепризначити');
    }

    const assignee = await this.prisma.user.findUnique({
      where: { id: dto.assigneeId },
      select: { id: true, roles: true, status: true },
    });

    if (!assignee || assignee.status !== 'ACTIVE' || !hasAnyRole(assignee.roles, TRIBUNAL_ADMIN_ROLES)) {
      throw new BadRequestException('Скаргу можна призначити лише адміністратору');
    }

    await this.prisma.tribunalComplaint.update({
      where: { id: complaintId },
      data: {
        assigneeId: assignee.id,
        ...(complaint.status === TribunalComplaintStatus.OPEN
          ? { status: TribunalComplaintStatus.IN_PROGRESS }
          : {}),
      },
    });

    return this.findOne(complaintId, userId, roles);
  }

  async resolve(
    complaintId: string,
    dto: ResolveTribunalComplaintDto,
    userId: string,
    roles: UserRole[],
  ) {
    if (!hasAnyRole(roles, TRIBUNAL_ADMIN_ROLES)) {
      throw new ForbiddenException('Розглядати скаргу може лише адміністрація');
    }

    const complaint = await this.prisma.tribunalComplaint.findUnique({
      where: { id: complaintId },
      select: {
        id: true,
        status: true,
        targetUserId: true,
        description: true,
        ruleNumber: true,
        ruleText: true,
      },
    });

    if (!complaint) {
      throw new NotFoundException('Скаргу не знайдено');
    }

    if (
      complaint.status !== TribunalComplaintStatus.OPEN &&
      complaint.status !== TribunalComplaintStatus.IN_PROGRESS
    ) {
      throw new BadRequestException('Скаргу вже розглянуто');
    }

    if (
      dto.outcome === TribunalResolveOutcome.PUNISHED &&
      dto.punishment?.type === TribunalPunishmentRequestType.PERMANENT_BAN &&
      !hasAnyRole(roles, PERMANENT_BAN_ROLES)
    ) {
      throw new ForbiddenException(
        'Перманентний бан може призначити лише власник або адміністратор сервера',
      );
    }

    const punished = dto.outcome === TribunalResolveOutcome.PUNISHED;
    const ruleNumber = dto.ruleNumber?.trim() ?? '';
    const ruleText = dto.ruleText?.trim() ?? '';

    if (punished && (!ruleNumber || !ruleText)) {
      throw new BadRequestException('Вкажіть номер і текст порушеного правила');
    }

    if (punished && !dto.punishment) {
      throw new BadRequestException('Оберіть покарання');
    }

    const { revokeUserId } = await this.prisma.$transaction(async (tx) => {
      const current = await tx.tribunalComplaint.findUnique({
        where: { id: complaintId },
        select: {
          id: true,
          status: true,
          targetUserId: true,
        },
      });

      if (!current) {
        throw new NotFoundException('Скаргу не знайдено');
      }

      if (!OPEN_COMPLAINT_STATUSES.includes(current.status)) {
        throw new BadRequestException('Скаргу вже розглянуто');
      }

      const claimed = await tx.tribunalComplaint.updateMany({
        where: {
          id: complaintId,
          status: { in: OPEN_COMPLAINT_STATUSES },
        },
        data: {
          status: punished
            ? TribunalComplaintStatus.PUNISHED
            : TribunalComplaintStatus.REJECTED,
          resolvedById: userId,
          ...(punished ? { ruleNumber, ruleText } : {}),
        },
      });

      if (claimed.count !== 1) {
        throw new BadRequestException('Скаргу вже розглянуто');
      }

      if (punished && dto.punishment) {
        const applied = await this.applyPunishment(
          current.targetUserId,
          ruleText,
          dto.punishment,
          userId,
          roles,
          ruleNumber,
          tx,
        );

        await tx.tribunalComplaint.update({
          where: { id: complaintId },
          data: {
            punishmentKind: applied.kind,
            punishmentId: applied.punishmentId,
            bannedUntil: applied.bannedUntil ?? null,
            warningWeight: applied.warningWeight,
          },
        });

        const comment = dto.comment?.trim();

        if (comment) {
          await tx.tribunalMessage.create({
            data: {
              complaintId,
              authorId: userId,
              body: comment,
            },
          });
        }

        return { revokeUserId: applied.revokeAccess ? current.targetUserId : null };
      }

      const comment = dto.comment?.trim();

      if (comment) {
        await tx.tribunalMessage.create({
          data: {
            complaintId,
            authorId: userId,
            body: comment,
          },
        });
      }

      return { revokeUserId: null };
    });

    if (revokeUserId) {
      await this.usersService.disconnectBannedUser(revokeUserId);
    }

    return this.findOne(complaintId, userId, roles);
  }

  private ensureCanWrite(
    complaint: { authorId: string; targetUserId: string },
    userId: string,
    roles: UserRole[],
  ) {
    const isParty =
      complaint.authorId === userId || complaint.targetUserId === userId;

    if (!isParty && !hasAnyRole(roles, TRIBUNAL_ADMIN_ROLES)) {
      throw new ForbiddenException('Писати можуть заявник, обвинувачений і адміністрація');
    }
  }

  private async applyPunishment(
    targetUserId: string,
    fallbackReason: string,
    punishment: TribunalPunishmentDto,
    adminId: string,
    roles: UserRole[],
    ruleNumber: string | null,
    tx: Prisma.TransactionClient,
  ) {
    const reason = punishment.reason?.trim() || fallbackReason.trim();
    const warningWeight = punishment.warningCount ?? 1;

    if (punishment.type === TribunalPunishmentRequestType.WARNING) {
      const created = await this.usersService.createWarningInTransaction(
        tx,
        targetUserId,
        {
          reason,
          weight: warningWeight,
          ...(ruleNumber ? { ruleNumber } : {}),
          ...(reason ? { ruleText: reason } : {}),
          ...(punishment.comment?.trim() ? { comment: punishment.comment.trim() } : {}),
        },
        adminId,
        roles,
      );

      return {
        kind: TribunalPunishmentKind.WARNING,
        punishmentId: created.punishmentId,
        warningWeight,
        bannedUntil: undefined,
        revokeAccess: false,
      };
    }

    if (punishment.type === TribunalPunishmentRequestType.TEMP_BAN) {
      const created = await this.usersService.banUserInTransaction(
        tx,
        {
          userId: targetUserId,
          bannedUntil: punishment.bannedUntil!,
        },
        { reason, mute: punishment.mute === true },
        adminId,
        roles,
      );

      return {
        kind: TribunalPunishmentKind.TEMP_BAN,
        punishmentId: created.punishmentId,
        warningWeight: null,
        bannedUntil: created.bannedUntil,
        revokeAccess: false,
      };
    }

    const created = await this.usersService.permanentlyBanUserInTransaction(
      tx,
      { userId: targetUserId },
      { reason },
      adminId,
      roles,
    );

    return {
      kind: TribunalPunishmentKind.PERMANENT_BAN,
      punishmentId: created.punishmentId,
      warningWeight: null,
      bannedUntil: undefined,
      revokeAccess: true,
    };
  }
}
