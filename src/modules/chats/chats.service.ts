import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "src/infrastructure/prisma/prisma.service";
import { CreateChatDto } from "./dto/create-chat.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { FindMessagesDto } from "./dto/find-messages.dto";
import { UpdateChatDto } from "./dto/update-chat.dto";
import { AddChatMembersDto } from "./dto/add-chat-members.dto";
import { ChatType } from "@prisma/client";

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

@Injectable()
export class ChatsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async sendMessage(dto: SendMessageDto, userId: string) {
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
      data: data.reverse(),
      total,
    };
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
