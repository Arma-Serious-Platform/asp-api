import { Injectable } from '@nestjs/common';
import { Prisma, UserHistoryEventType } from '@prisma/client';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';

export type HistoryDb = Prisma.TransactionClient | PrismaService;

export type AppendHistoryEventParams = {
  userId: string;
  actorId?: string | null;
  type: UserHistoryEventType;
  payload?: Prisma.InputJsonValue;
  createdAt?: Date;
};

@Injectable()
export class UsersHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  append(db: HistoryDb, params: AppendHistoryEventParams) {
    return db.userHistoryEvent.create({
      data: {
        userId: params.userId,
        actorId: params.actorId ?? null,
        type: params.type,
        payload: params.payload ?? {},
        ...(params.createdAt ? { createdAt: params.createdAt } : {}),
      },
    });
  }

  async findByUserId(userId: string, limit = 200) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return null;
    }

    return this.prisma.userHistoryEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        actor: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });
  }
}
