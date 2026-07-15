import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "src/infrastructure/prisma/prisma.service";
import { CreateChatDto } from "./dto/create-chat.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { FindMessagesDto } from "./dto/find-messages.dto";
import { UpdateChatDto } from "./dto/update-chat.dto";
import { UpdateMessageDto } from "./dto/update-message.dto";
import { AddChatMembersDto } from "./dto/add-chat-members.dto";
import { ChatType } from "@prisma/client";
import { MinioService } from "src/infrastructure/minio/minio.service";
import { Multer } from "multer";
import { attachmentInclude, uploadAttachmentFiles } from "src/shared/utils/upload-attachments";
import { parseRemovedAttachmentIds, syncAttachmentUpdates } from "src/shared/utils/sync-comment-attachments";

const chatInclude = {
  users: {
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
  },
} as const;

const messageInclude = {
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
  quoteMessage: {
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
        },
      },
    },
  },
  ...attachmentInclude,
} as const;

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  private async reactivateChatUsers(chatId: string, userIds: string[]) {
    await this.prisma.chatUser.updateMany({
      where: {
        chatId,
        userId: { in: userIds },
        leftAt: { not: null },
      },
      data: {
        leftAt: null,
      },
    });
  }

  private async findDirectChatBetweenUsers(userIds: string[]) {
    if (userIds.length !== 2) {
      return null;
    }

    return await this.prisma.chat.findFirst({
      where: {
        type: ChatType.DIRECT,
        AND: userIds.map((id) => ({
          users: {
            some: {
              userId: id,
            },
          },
        })),
      },
      include: chatInclude,
    });
  }

  async create(dto: CreateChatDto, userId: string) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: dto.userIds } },
      select: { id: true },
    });

    if (users.length !== dto.userIds.length) {
      const foundIds = new Set(users.map((u) => u.id));
      const missingIds = dto.userIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(`Users not found: ${missingIds.join(', ')}`);
    }

    if (dto.type === ChatType.DIRECT) {
      if (dto.userIds.length !== 2) {
        throw new BadRequestException('Direct chats must have exactly 2 users');
      }

      if (!dto.userIds.includes(userId)) {
        throw new BadRequestException('You must be included in the chat');
      }

      const existingChat = await this.findDirectChatBetweenUsers(dto.userIds);

      if (existingChat) {
        if (dto.name?.trim()) {
          await this.prisma.chat.update({
            where: { id: existingChat.id },
            data: { name: dto.name.trim() },
          });
        }

        await this.reactivateChatUsers(existingChat.id, dto.userIds);
        return this.findById(existingChat.id, userId);
      }
    } else {
      if (!dto.userIds.includes(userId)) {
        throw new BadRequestException('You must be included in the chat');
      }
    }

    return await this.prisma.chat.create({
      data: {
        name: dto.name?.trim() || undefined,
        type: dto.type,
        creatorId: userId,
        users: {
          create: dto.userIds.map((memberId) => ({
            userId: memberId,
          })),
        },
      },
      include: chatInclude,
    });
  }

  async findAll(userId: string) {
    return await this.prisma.chat.findMany({
      where: {
        users: {
          some: {
            userId,
            leftAt: null,
          },
        },
      },
      include: {
        ...chatInclude,
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            user: {
              select: {
                id: true,
                nickname: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findById(id: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id },
      include: chatInclude,
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const isMember = chat.users.some((cu) => cu.userId === userId && !cu.leftAt);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    return chat;
  }

  async sendMessage(dto: SendMessageDto, userId: string, attachmentFiles: Multer.File[] = []) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: dto.chatId },
      include: {
        users: {
          where: {
            userId,
            leftAt: null,
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.users.length === 0) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    if (dto.quoteMessageId) {
      const quoteMessage = await this.prisma.message.findUnique({
        where: { id: dto.quoteMessageId },
      });

      if (!quoteMessage || quoteMessage.chatId !== dto.chatId) {
        throw new BadRequestException('Quote message not found or belongs to different chat');
      }
    }

    const uploadedAttachments = await uploadAttachmentFiles(this.minioService, attachmentFiles);

    return await this.prisma.message.create({
      data: {
        content: dto.content,
        chatId: dto.chatId,
        userId,
        ...(dto.quoteMessageId && { quoteMessageId: dto.quoteMessageId }),
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
      include: messageInclude,
    });
  }

  async findMessages(dto: FindMessagesDto, userId: string) {
    const chatId = dto.chatId;
    const skip = Number(dto.skip ?? 0);
    const take = Number(dto.take ?? 100);

    if (!chatId) {
      throw new BadRequestException('chatId is required');
    }

    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        users: {
          where: {
            userId,
            leftAt: null,
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.users.length === 0) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.message.count({
        where: { chatId },
      }),
      this.prisma.message.findMany({
        where: { chatId },
        skip,
        take,
        include: messageInclude,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      data: [...data].reverse(),
      total,
    };
  }

  async updateMessage(
    chatId: string,
    messageId: string,
    dto: UpdateMessageDto,
    userId: string,
    attachmentFiles: Multer.File[] = [],
  ) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        attachments: {
          select: {
            id: true,
            fileId: true,
          },
        },
      },
    });

    if (!message || message.chatId !== chatId) {
      throw new NotFoundException('Message not found');
    }

    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        users: {
          where: {
            userId,
            leftAt: null,
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.users.length === 0) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    if (message.userId !== userId) {
      throw new ForbiddenException('You can only update your own messages');
    }

    if (dto.content === undefined && !dto.removedAttachmentIds?.length && attachmentFiles.length === 0) {
      throw new BadRequestException('Nothing to update');
    }

    const removedAttachmentIds = parseRemovedAttachmentIds(dto.removedAttachmentIds);
    const uploadedAttachments = await syncAttachmentUpdates({
      minioService: this.minioService,
      existing: message.attachments,
      removedAttachmentIds,
      newFiles: attachmentFiles,
      deleteAttachment: (attachmentId) =>
        this.prisma.messageAttachment.delete({ where: { id: attachmentId } }),
    });

    return await this.prisma.message.update({
      where: { id: messageId },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        editedAt: new Date(),
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
      include: messageInclude,
    });
  }

  async deleteMessage(chatId: string, messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        attachments: {
          select: {
            fileId: true,
          },
        },
      },
    });

    if (!message || message.chatId !== chatId) {
      throw new NotFoundException('Message not found');
    }

    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        users: {
          where: {
            userId,
            leftAt: null,
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.users.length === 0) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    if (message.userId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    const fileIds = message.attachments.map((attachment) => attachment.fileId);

    await this.prisma.message.delete({
      where: { id: messageId },
    });

    for (const fileId of fileIds) {
      await this.minioService.deleteFile(fileId);
    }

    return { message: 'Message deleted successfully', id: messageId, chatId };
  }

  async leaveChat(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        creatorId: true,
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.creatorId === userId) {
      throw new BadRequestException('Chat creator cannot leave. Delete the chat instead.');
    }

    const chatUser = await this.prisma.chatUser.findFirst({
      where: {
        chatId,
        userId,
        leftAt: null,
      },
    });

    if (!chatUser) {
      throw new NotFoundException('You are not a member of this chat');
    }

    await this.prisma.chatUser.update({
      where: { id: chatUser.id },
      data: {
        leftAt: new Date(),
      },
    });

    return { message: 'Left chat successfully', chatId };
  }

  async deleteChat(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        users: {
          where: {
            leftAt: null,
          },
          select: {
            userId: true,
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.creatorId && chat.creatorId !== userId) {
      throw new ForbiddenException('Only the chat creator can delete the chat');
    }

    const memberUserIds = chat.users.map((member) => member.userId);

    await this.prisma.chat.delete({
      where: { id: chatId },
    });

    return {
      message: 'Chat deleted successfully',
      chatId,
      memberUserIds,
    };
  }

  async addMembers(chatId: string, dto: AddChatMembersDto, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        users: true,
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.creatorId !== userId) {
      throw new ForbiddenException('Only the chat creator can add members');
    }

    if (chat.type === ChatType.DIRECT) {
      throw new BadRequestException('Cannot add members to a direct chat');
    }

    const isCreatorActive = chat.users.some(
      (member) => member.userId === userId && !member.leftAt,
    );

    if (!isCreatorActive) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: dto.userIds } },
      select: { id: true },
    });

    if (users.length !== dto.userIds.length) {
      const foundIds = new Set(users.map((user) => user.id));
      const missingIds = dto.userIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(`Users not found: ${missingIds.join(', ')}`);
    }

    const rejoinedUserIds: string[] = [];

    for (const memberId of dto.userIds) {
      const existingMember = chat.users.find((member) => member.userId === memberId);

      if (existingMember) {
        if (existingMember.leftAt) {
          await this.prisma.chatUser.update({
            where: { id: existingMember.id },
            data: { leftAt: null },
          });
          rejoinedUserIds.push(memberId);
        }
        continue;
      }

      await this.prisma.chatUser.create({
        data: {
          chatId,
          userId: memberId,
        },
      });
      rejoinedUserIds.push(memberId);
    }

    const updatedChat = await this.findById(chatId, userId);

    return {
      chat: updatedChat,
      rejoinedUserIds,
    };
  }

  async update(id: string, dto: UpdateChatDto, userId: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id },
      include: {
        users: {
          where: {
            userId,
            leftAt: null,
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.users.length === 0) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    return await this.prisma.chat.update({
      where: { id },
      data: {
        name: dto.name,
      },
      include: chatInclude,
    });
  }
}
