import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from "@nestjs/common";
import { PrismaService } from "src/infrastructure/prisma/prisma.service";
import { CreateMissionCommentDto } from "./dto/create-mission-comment.dto";
import { UpdateMissionCommentDto } from "./dto/update-mission-comment.dto";
import { FindMissionCommentsDto } from "./dto/find-mission-comments.dto";
import { MissionCommentsGateway } from "./mission-comments.gateway";
import { Prisma } from "@prisma/client";
import { MinioService } from "src/infrastructure/minio/minio.service";
import { Multer } from "multer";
import { attachmentInclude, uploadAttachmentFiles } from "src/shared/utils/upload-attachments";

@Injectable()
export class MissionCommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    @Inject(forwardRef(() => MissionCommentsGateway))
    private readonly gateway: MissionCommentsGateway,
  ) {}

  async create(dto: CreateMissionCommentDto, userId: string, attachmentFiles: Multer.File[] = []) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: dto.missionId },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    let replyId: string | undefined;
    if (dto.replyId !== undefined) {
      const replyTo = await this.prisma.missionComment.findUnique({
        where: { id: dto.replyId as string },
      });
      if (!replyTo) {
        throw new NotFoundException('Reply-to comment not found');
      }
      if (replyTo.missionId !== dto.missionId) {
        throw new BadRequestException('Reply must be to a comment on the same mission');
      }
      replyId = dto.replyId as string;
    }

    const uploadedAttachments = await uploadAttachmentFiles(this.minioService, attachmentFiles);

    const comment = await this.prisma.missionComment.create({
      data: {
        missionId: dto.missionId,
        userId,
        message: dto.message,
        ...(replyId && { replyId }),
        ...(uploadedAttachments.length > 0 && {
          attachments: {
            create: uploadedAttachments.map((attachment) => ({
              fileId: attachment.fileId,
              originalName: attachment.originalName,
              mimeType: attachment.mimeType,
            })),
          },
        }),
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
              },
            },
          },
        },
        ...attachmentInclude,
      },
    });

    this.gateway.emitNewComment(dto.missionId, comment);

    return comment;
  }

  async findAll(dto: FindMissionCommentsDto) {
    const { missionId, replyId, skip = 0, take = 100 } = dto;

    const where: Prisma.MissionCommentWhereInput = {};
    if (missionId) {
      where.missionId = missionId;
    }
    if (replyId !== undefined) {
      where.replyId = replyId;
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
              squad: {
                select: {
                  id: true,
                  tag: true,
                  side: {
                    select: {
                      type: true
                    }
                  }
                }
              }
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
                },
              },
            },
          },
          ...attachmentInclude,
        },
        orderBy: {
          createdAt: 'asc',
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
              },
            },
          },
        },
        ...attachmentInclude,
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

    const updateData: { message?: Prisma.InputJsonValue; replyId?: string | null } = {};
    if (dto.message !== undefined) {
      updateData.message = dto.message as Prisma.InputJsonValue;
    }
    if (dto.replyId !== undefined) {
      if (dto.replyId === null) {
        updateData.replyId = null;
      } else {
        const replyTo = await this.prisma.missionComment.findUnique({
          where: { id: dto.replyId as string },
        });
        if (!replyTo) {
          throw new NotFoundException('Reply-to comment not found');
        }
        if (replyTo.missionId !== comment.missionId) {
          throw new BadRequestException('Reply must be to a comment on the same mission');
        }
        updateData.replyId = dto.replyId as string;
      }
    }

    const updatedComment = await this.prisma.missionComment.update({
      where: { id },
      data: updateData,
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
              },
            },
          },
        },
        ...attachmentInclude,
      },
    });

    this.gateway.emitUpdatedComment(comment.missionId, updatedComment);

    return updatedComment;
  }

  async delete(id: string, userId: string) {
    const comment = await this.prisma.missionComment.findUnique({
      where: { id },
      include: {
        attachments: {
          select: {
            fileId: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    const missionId = comment.missionId;
    const fileIds = comment.attachments.map((attachment) => attachment.fileId);

    await this.prisma.missionComment.delete({
      where: { id },
    });

    for (const fileId of fileIds) {
      await this.minioService.deleteFile(fileId);
    }

    this.gateway.emitDeletedComment(missionId, id);

    return { message: 'Comment deleted successfully' };
  }
}
