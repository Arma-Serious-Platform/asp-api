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
import { JwtService } from '@nestjs/jwt';
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
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake?.auth?.token as string ||
        (client.handshake?.headers?.authorization?.split(' ')[1] as string);

      if (!token) {
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.decode(token) as { userId?: string | undefined }
      ;
      const userId = decoded?.userId;

      if (!userId) {
        client.disconnect();
        return;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      client.userId = userId;
      console.log(
        `User ${userId} connected to mission-comments (socket: ${client.id})`,
      );
    } catch (error) {
      console.error('Mission comments connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    if (userId) {
      console.log(
        `User ${userId} disconnected from mission-comments (socket: ${client.id})`,
      );
    }
  }

  @SubscribeMessage('join_mission')
  async handleJoinMission(
    @MessageBody() data: { missionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      // Verify mission exists
      const mission = await this.prisma.mission.findUnique({
        where: { id: data.missionId },
      });

      if (!mission) {
        return { error: 'Mission not found' };
      }

      client.join(`mission:${data.missionId}`);
      return { success: true };
    } catch (error) {
      return { error: error.message };
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
