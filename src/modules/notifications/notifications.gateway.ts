import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Namespace, Socket } from 'socket.io';
import { NotificationGroup, NotificationType } from '@prisma/client';
import { AuthService } from 'src/modules/auth/auth.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export type NotificationSocketPayload = {
  group: NotificationGroup;
  type: NotificationType;
};

const notificationsGatewayCors = {
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim())
    : true,
  credentials: true,
};

@WebSocketGateway({
  cors: notificationsGatewayCors,
  namespace: '/notifications',
})
@Injectable()
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Namespace;

  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const authUser = await this.authService.resolveHandshakeUser(
        client.handshake,
      );

      if (!authUser) {
        client.disconnect();
        return;
      }

      client.userId = authUser.userId;
      client.join(`user:${authUser.userId}`);
    } catch (error) {
      console.error('Notifications connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    client.userId = undefined;
  }

  emitToUsers(userIds: string[], payload: NotificationSocketPayload) {
    if (!this.server || userIds.length === 0) {
      return;
    }

    for (const userId of userIds) {
      this.server.to(`user:${userId}`).emit('notification', payload);
    }
  }
}
