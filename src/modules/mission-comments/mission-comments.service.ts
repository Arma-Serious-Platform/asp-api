import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from "@nestjs/common";
import { PrismaService } from "src/infrastructure/prisma/prisma.service";
import { CreateMissionCommentDto } from "./dto/create-mission-comment.dto";
import { UpdateMissionCommentDto } from "./dto/update-mission-comment.dto";
import { FindMissionCommentsDto } from "./dto/find-mission-comments.dto";
import { MissionCommentsGateway } from "./mission-comments.gateway";

@Injectable()
export class MissionCommentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MissionCommentsGateway))
    private readonly gateway: MissionCommentsGateway,
  ) {}

  async create(dto: CreateMissionCommentDto, userId: string) {
    // Verify mission exists
    const mission = await this.prisma.mission.findUnique({
      where: { id: dto.missionId },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    const comment = await this.prisma.missionComment.create({
      data: {
        missionId: dto.missionId,
        userId,
        message: dto.message,
      },
      include: {
        user: {
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
      },
    });

    // Emit real-time update
    this.gateway.emitNewComment(dto.missionId, comment);

    return comment;
  }

  async findAll(dto: FindMissionCommentsDto) {
    const { missionId, skip = 0, take = 100 } = dto;

    const where: any = {};
    if (missionId) {
      where.missionId = missionId;
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.missionComment.count({ where }),
      this.prisma.missionComment.findMany({
        where,
        skip,
        take,
        include: {
          user: {
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
        },
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

  async findById(id: string) {
    const comment = await this.prisma.missionComment.findUnique({
      where: { id },
      include: {
        user: {
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
        mission: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  async update(id: string, dto: UpdateMissionCommentDto, userId: string) {
    const comment = await this.prisma.missionComment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    const updatedComment = await this.prisma.missionComment.update({
      where: { id },
      data: {
        ...(dto.message !== undefined && { message: dto.message }),
      },
      include: {
        user: {
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
      },
    });

    // Emit real-time update
    this.gateway.emitUpdatedComment(comment.missionId, updatedComment);

    return updatedComment;
  }

  async delete(id: string, userId: string) {
    const comment = await this.prisma.missionComment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    const missionId = comment.missionId;

    await this.prisma.missionComment.delete({
      where: { id },
    });

    // Emit real-time update
    this.gateway.emitDeletedComment(missionId, id);

    return { message: 'Comment deleted successfully' };
  }
}
