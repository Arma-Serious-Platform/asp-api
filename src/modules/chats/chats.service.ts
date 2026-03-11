import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "src/infrastructure/prisma/prisma.service";
import { CreateChatDto } from "./dto/create-chat.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { FindMessagesDto } from "./dto/find-messages.dto";
import { ChatType } from "@prisma/client";

@Injectable()
export class ChatsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateChatDto, userId: string) {
    // Validate all users exist
    const users = await this.prisma.user.findMany({
      where: { id: { in: dto.userIds } },
      select: { id: true },
    });

    if (users.length !== dto.userIds.length) {
      const foundIds = new Set(users.map((u) => u.id));
      const missingIds = dto.userIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(`Users not found: ${missingIds.join(', ')}`);
    }

    // For DIRECT chats, ensure only 2 users and check if chat already exists
    if (dto.type === ChatType.DIRECT) {
      if (dto.userIds.length !== 2) {
        throw new BadRequestException('Direct chats must have exactly 2 users');
      }

      if (!dto.userIds.includes(userId)) {
        throw new BadRequestException('You must be included in the chat');
      }

      // Check if direct chat already exists between these two users
      const existingChats = await this.prisma.chat.findMany({
        where: {
          type: ChatType.DIRECT,
          users: {
            some: {
              userId: { in: dto.userIds },
            },
          },
        },
        include: {
          users: {
            where: {
              leftAt: null,
            },
          },
        },
      });

      // Find chat with exactly these two users
      const existingChat = existingChats.find(
        (chat) =>
          chat.users.length === 2 &&
          chat.users.every((cu) => dto.userIds.includes(cu.userId)),
      );

      if (existingChat) {
        return this.findById(existingChat.id, userId);
      }
    } else {
      // For GROUP chats, ensure creator is included
      if (!dto.userIds.includes(userId)) {
        throw new BadRequestException('You must be included in the chat');
      }
    }

    return await this.prisma.chat.create({
      data: {
        name: dto.name,
        type: dto.type,
        users: {
          create: dto.userIds.map((userId) => ({
            userId,
          })),
        },
      },
      include: {
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
      },
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
      include: {
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
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Check if user is part of the chat
    const isMember = chat.users.some((cu) => cu.userId === userId && !cu.leftAt);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    return chat;
  }

  async sendMessage(dto: SendMessageDto, userId: string) {
    // Verify chat exists and user is a member
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

    // Verify quote message exists if provided
    if (dto.quoteMessageId) {
      const quoteMessage = await this.prisma.message.findUnique({
        where: { id: dto.quoteMessageId },
      });

      if (!quoteMessage || quoteMessage.chatId !== dto.chatId) {
        throw new BadRequestException('Quote message not found or belongs to different chat');
      }
    }

    return await this.prisma.message.create({
      data: {
        content: dto.content,
        chatId: dto.chatId,
        userId,
        ...(dto.quoteMessageId && { quoteMessageId: dto.quoteMessageId }),
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
      },
    });
  }

  async findMessages(dto: FindMessagesDto, userId: string) {
    const { chatId, skip = 0, take = 100 } = dto;

    if (!chatId) {
      throw new BadRequestException('chatId is required');
    }

    // Verify user is a member of the chat
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
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      data: data.reverse(), // Reverse to show oldest first
      total,
    };
  }

  async leaveChat(chatId: string, userId: string) {
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

    return { message: 'Left chat successfully' };
  }
}
