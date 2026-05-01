import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Injectable } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "src/infrastructure/prisma/prisma.service";
import { SideType } from "@prisma/client";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/headquarters',
})
@Injectable()
export class HeadquartersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        (client.handshake?.auth?.token as string) ||
        (client.handshake?.headers?.authorization?.split(' ')[1] as string);

      if (!token) {
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.decode(token) as { userId?: string | undefined };
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
      console.log(`User ${userId} connected to headquarters (socket: ${client.id})`);
    } catch (error) {
      console.error('Headquarters connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      console.log(`User ${client.userId} disconnected from headquarters (socket: ${client.id})`);
    }
  }

  @SubscribeMessage('join_game_plan')
  async handleJoinGamePlan(
    @MessageBody() data: { gamePlanId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const [user, gamePlan] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: client.userId },
        select: {
          id: true,
          squad: {
            select: {
              sideId: true,
              side: {
                select: {
                  type: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.gamePlan.findUnique({
        where: { id: data.gamePlanId },
        select: {
          id: true,
          sideId: true,
        },
      }),
    ]);

    if (!user?.squad?.sideId) {
      return { error: 'You are not a member of a squad' };
    }

    const allowedTypes = new Set<SideType>([SideType.BLUE, SideType.RED]);
    if (!allowedTypes.has(user.squad.side.type)) {
      return { error: 'Your side is not eligible for headquarters plans' };
    }

    if (!gamePlan) {
      return { error: 'Game plan not found' };
    }

    if (gamePlan.sideId !== user.squad.sideId) {
      return { error: 'Forbidden for this side' };
    }

    client.join(`headquarters:plan:${data.gamePlanId}`);
    return { success: true };
  }

  @SubscribeMessage('leave_game_plan')
  async handleLeaveGamePlan(
    @MessageBody() data: { gamePlanId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    client.leave(`headquarters:plan:${data.gamePlanId}`);
    return { success: true };
  }

  emitGamePlanUpdated(gamePlanId: string, data: any) {
    this.server.to(`headquarters:plan:${gamePlanId}`).emit('game_plan_updated', data);
  }

  emitCommanderChanged(gamePlanId: string, data: any) {
    this.server.to(`headquarters:plan:${gamePlanId}`).emit('commander_changed', data);
  }

  emitSlotUpdated(gamePlanId: string, data: any) {
    this.server.to(`headquarters:plan:${gamePlanId}`).emit('slot_updated', data);
  }

  emitCommentCreated(gamePlanId: string, data: any) {
    this.server.to(`headquarters:plan:${gamePlanId}`).emit('comment_created', data);
  }

  emitCommentUpdated(gamePlanId: string, data: any) {
    this.server.to(`headquarters:plan:${gamePlanId}`).emit('comment_updated', data);
  }

  emitCommentDeleted(gamePlanId: string, commentId: string) {
    this.server.to(`headquarters:plan:${gamePlanId}`).emit('comment_deleted', { id: commentId });
  }
}
