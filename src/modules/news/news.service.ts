import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NewsType, Prisma } from '@prisma/client';
import { Multer } from 'multer';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { MinioService } from 'src/infrastructure/minio/minio.service';
import { ASP_BUCKET } from 'src/infrastructure/minio/minio.lib';
import {
  attachmentInclude,
  uploadAttachmentFiles,
} from 'src/shared/utils/upload-attachments';
import {
  parseRemovedAttachmentIds,
  syncAttachmentUpdates,
} from 'src/shared/utils/sync-comment-attachments';
import { commentUserSelect } from 'src/shared/utils/comment-user-select';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { FindNewsDto } from './dto/find-news.dto';
import { ChannelAnnouncementsService } from 'src/infrastructure/bots/channel-announcements.service';

@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly channelAnnouncements: ChannelAnnouncementsService,
  ) {}

  private readonly newsInclude = {
    author: { select: commentUserSelect },
    lastEditedBy: { select: commentUserSelect },
    image: {
      select: {
        id: true,
        url: true,
        filename: true,
      },
    },
    ...attachmentInclude,
  } satisfies Prisma.NewsInclude;

  private resolveDateRange(dateFrom?: string, dateTo?: string) {
    const range: Prisma.DateTimeFilter = {};

    if (dateFrom) {
      range.gte = new Date(dateFrom);
    }

    if (dateTo) {
      const end = new Date(dateTo);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
        end.setHours(23, 59, 59, 999);
      }
      range.lte = end;
    }

    return Object.keys(range).length > 0 ? range : undefined;
  }

  private buildWhere(
    dto: FindNewsDto,
    options: { forcePublished?: boolean } = {},
  ): Prisma.NewsWhereInput {
    const date = this.resolveDateRange(dto.dateFrom, dto.dateTo);
    const search = dto.search?.trim();

    return {
      ...(options.forcePublished ? { published: true } : {}),
      ...(dto.published !== undefined && !options.forcePublished
        ? { published: dto.published }
        : {}),
      ...(dto.type ? { type: dto.type } : {}),
      ...(dto.authorId ? { authorId: dto.authorId } : {}),
      ...(date ? { date } : {}),
      ...(search
        ? {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {}),
    };
  }

  async uploadContentMedia(file: Multer.File) {
    const uploaded = await this.minioService.uploadFile(
      ASP_BUCKET.NEWS_IMAGES,
      file,
    );

    return {
      id: uploaded.id,
      url: uploaded.url,
      filename: uploaded.filename,
    };
  }

  private async findMany(dto: FindNewsDto, forcePublished = false) {
    const skip = Number(dto.skip ?? 0);
    const take = Number(dto.take ?? 50);
    const where = this.buildWhere(dto, { forcePublished });

    const [total, data] = await this.prisma.$transaction([
      this.prisma.news.count({ where }),
      this.prisma.news.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: this.newsInclude,
      }),
    ]);

    return { data, total, skip, take };
  }

  findPublic(dto: FindNewsDto) {
    return this.findMany(dto, true);
  }

  findAdmin(dto: FindNewsDto) {
    return this.findMany(dto, false);
  }

  async findPublicById(id: string) {
    const news = await this.prisma.news.findFirst({
      where: { id, published: true },
      include: this.newsInclude,
    });

    if (!news) {
      throw new NotFoundException('News not found');
    }

    return news;
  }

  async findAdminById(id: string) {
    const news = await this.prisma.news.findUnique({
      where: { id },
      include: this.newsInclude,
    });

    if (!news) {
      throw new NotFoundException('News not found');
    }

    return news;
  }

  async create(
    dto: CreateNewsDto,
    authorId: string,
    image?: Multer.File,
    attachmentFiles: Multer.File[] = [],
  ) {
    if (!dto.content || typeof dto.content !== 'object') {
      throw new BadRequestException('Content is required');
    }

    let imageId: string | undefined;
    if (image) {
      const uploaded = await this.minioService.uploadFile(
        ASP_BUCKET.NEWS_IMAGES,
        image,
      );
      imageId = uploaded.id;
    }

    const uploadedAttachments = await uploadAttachmentFiles(
      this.minioService,
      attachmentFiles,
    );

    const created = await this.prisma.news.create({
      data: {
        title: dto.title.trim(),
        shortDescription:
          dto.shortDescription === undefined
            ? undefined
            : (dto.shortDescription as Prisma.InputJsonValue),
        content: dto.content as Prisma.InputJsonValue,
        published: dto.published ?? false,
        type: dto.type ?? NewsType.INFO,
        date: dto.date ? new Date(dto.date) : new Date(),
        authorId,
        lastEditedById: authorId,
        ...(imageId ? { imageId } : {}),
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
      include: this.newsInclude,
    });

    if (created.published) {
      await this.channelAnnouncements.announceNews(created);
    }

    return created;
  }

  async update(
    id: string,
    dto: UpdateNewsDto,
    editorId: string,
    image?: Multer.File,
    attachmentFiles: Multer.File[] = [],
  ) {
    const existing = await this.prisma.news.findUnique({
      where: { id },
      include: {
        attachments: {
          select: { id: true, fileId: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('News not found');
    }

    const removedAttachmentIds = parseRemovedAttachmentIds(
      dto.removedAttachmentIds,
    );

    const newAttachments = await syncAttachmentUpdates({
      minioService: this.minioService,
      existing: existing.attachments,
      removedAttachmentIds,
      newFiles: attachmentFiles,
      deleteAttachment: (attachmentId) =>
        this.prisma.newsAttachment.delete({ where: { id: attachmentId } }),
    });

    let imageId: string | null | undefined = undefined;
    if (image) {
      const uploaded = await this.minioService.uploadFile(
        ASP_BUCKET.NEWS_IMAGES,
        image,
      );
      imageId = uploaded.id;
      if (existing.imageId) {
        await this.minioService.deleteFile(existing.imageId);
      }
    } else if (dto.removeImage) {
      imageId = null;
      if (existing.imageId) {
        await this.minioService.deleteFile(existing.imageId);
      }
    }

    const wasPublished = existing.published;

    const updated = await this.prisma.news.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.shortDescription !== undefined && {
          shortDescription: dto.shortDescription as Prisma.InputJsonValue,
        }),
        ...(dto.content !== undefined && {
          content: dto.content as Prisma.InputJsonValue,
        }),
        ...(dto.published !== undefined && { published: dto.published }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        lastEditedById: editorId,
        ...(imageId !== undefined && { imageId }),
        ...(newAttachments.length > 0 && {
          attachments: {
            create: newAttachments.map((attachment) => ({
              fileId: attachment.fileId,
              originalName: attachment.originalName,
              mimeType: attachment.mimeType,
            })),
          },
        }),
      },
      include: this.newsInclude,
    });

    if (!wasPublished && updated.published) {
      await this.channelAnnouncements.announceNews(updated);
    }

    return updated;
  }

  async delete(id: string) {
    const existing = await this.prisma.news.findUnique({
      where: { id },
      include: {
        attachments: {
          select: { fileId: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('News not found');
    }

    await this.prisma.news.delete({ where: { id } });

    if (existing.imageId) {
      await this.minioService.deleteFile(existing.imageId);
    }

    for (const attachment of existing.attachments) {
      await this.minioService.deleteFile(attachment.fileId);
    }

    return { message: 'News deleted successfully' };
  }
}
