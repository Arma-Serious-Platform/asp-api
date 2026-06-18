import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { ChatsService } from './chats.service';
import { SendMessageDto } from './dto/send-message.dto';
import { AuthService } from 'src/modules/auth/auth.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

const chatGatewayCors = {
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim())
    : true,
  credentials: true,
};

@WebSocketGateway({
  cors: chatGatewayCors,
  namespace: '/chat',
})
@Injectable()
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>();
  private socketUsers = new Map<string, string>();

  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly chatsService: ChatsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const authUser = await this.authService.resolveHandshakeUser(client.handshake);

      if (!authUser) {
        client.disconnect();
        return;
      }

      const userId = authUser.userId;
      client.userId = userId;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      this.socketUsers.set(client.id, userId);

      client.join(`user:${userId}`);

      const chats = await this.prisma.chat.findMany({
        where: {
          users: {
            some: {
              userId,
              leftAt: null,
            },
          },
        },
        select: { id: true },
      });

      chats.forEach((chat) => {
        client.join(`chat:${chat.id}`);
      });
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.socketUsers.delete(client.id);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const message = await this.chatsService.sendMessage(dto, client.userId);
      this.emitToChat(dto.chatId, 'new_message', message);

      return { success: true, data: message };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to send message' };
    }
  }

  @SubscribeMessage('join_chat')
  async handleJoinChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      await this.chatsService.findById(data.chatId, client.userId);
      client.join(`chat:${data.chatId}`);
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to join chat' };
    }
  }

  @SubscribeMessage('leave_chat')
  async handleLeaveChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    client.leave(`chat:${data.chatId}`);
    return { success: true };
  }

  joinOnlineUsersToChat(chatId: string, userIds: string[]) {
    for (const userId of userIds) {
      const sockets = this.userSockets.get(userId);
      if (!sockets) {
        continue;
      }

      for (const socketId of sockets) {
        const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket | undefined;
        socket?.join(`chat:${chatId}`);
      }
    }
  }

  emitToUser(userId: string, event: string, data: unknown) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }

  emitToChat(chatId: string, event: string, data: unknown) {
    this.server.to(`chat:${chatId}`).emit(event, data);
  }
}
