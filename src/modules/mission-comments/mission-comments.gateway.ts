/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
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
import { AuthService } from 'src/modules/auth/auth.service';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/mission-comments',
})
@Injectable()
export class MissionCommentsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
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
    } catch (error) {
      console.error('Mission comments connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(_client: AuthenticatedSocket) {}

  @SubscribeMessage('join_mission')
  async handleJoinMission(
    @MessageBody() data: { missionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: data.missionId },
        select: { id: true },
      });

      if (!mission) {
        return { error: 'Mission not found' };
      }

      client.join(`mission:${data.missionId}`);
      return { success: true };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : 'Failed to join mission',
      };
    }
  }

  @SubscribeMessage('leave_mission')
  async handleLeaveMission(
    @MessageBody() data: { missionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    client.leave(`mission:${data.missionId}`);
    return { success: true };
  }

  // Emit new comment to mission room
  emitNewComment(missionId: string, comment: any) {
    this.server.to(`mission:${missionId}`).emit('new_comment', comment);
  }

  // Emit updated comment to mission room
  emitUpdatedComment(missionId: string, comment: any) {
    this.server.to(`mission:${missionId}`).emit('updated_comment', comment);
  }

  // Emit deleted comment to mission room
  emitDeletedComment(missionId: string, commentId: string) {
    this.server
      .to(`mission:${missionId}`)
      .emit('deleted_comment', { id: commentId });
  }

  // Join mission room
  joinMissionRoom(client: Socket, missionId: string) {
    client.join(`mission:${missionId}`);
  }
}
