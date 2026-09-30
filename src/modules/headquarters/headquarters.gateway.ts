import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Injectable } from "@nestjs/common";
import { RealtimeService } from 'src/infrastructure/realtime/realtime.service';
import { websocketGatewayOptions } from 'src/shared/utils/allowed-origins';
import { Namespace, Server, Socket } from "socket.io";
import { PrismaService } from "src/infrastructure/prisma/prisma.service";
import { AuthService } from "src/modules/auth/auth.service";
import { SideType, SquadRole } from "@prisma/client";

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

const PLAN_ROOM_PREFIX = 'headquarters:plan:';

@WebSocketGateway({
  ...websocketGatewayOptions,
  namespace: '/headquarters',
})
@Injectable()
export class HeadquartersGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(namespace: Namespace) {
    this.realtime.registerNamespace(namespace);
    this.realtime.onSquadMembershipChanged(() =>
      this.revalidatePlanRooms(namespace),
    );
  }

  // Plan rooms are joined after an access check, but squad/side/role changes
  // can revoke that access later: drop sockets from rooms they may no longer see.
  private async revalidatePlanRooms(namespace: Namespace) {
    for (const socket of namespace.sockets.values()) {
      const client = socket as AuthenticatedSocket;

      for (const room of [...client.rooms]) {
        if (!room.startsWith(PLAN_ROOM_PREFIX)) {
          continue;
        }

        const error = client.userId
          ? await this.getPlanAccessError(
              client.userId,
              room.slice(PLAN_ROOM_PREFIX.length),
            )
          : 'Unauthorized';

        if (error) {
          await client.leave(room);
        }
      }
    }
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const authUser = await this.authService.resolveHandshakeUser(client.handshake);

      if (!authUser) {
        client.disconnect();
        return;
      }

      client.userId = authUser.userId;
      console.log(`User ${authUser.userId} connected to headquarters (socket: ${client.id})`);
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

    const error = await this.getPlanAccessError(client.userId, data.gamePlanId);
    if (error) {
      return { error };
    }

    client.join(`${PLAN_ROOM_PREFIX}${data.gamePlanId}`);
    return { success: true };
  }

  private async getPlanAccessError(
    userId: string,
    gamePlanId: string,
  ): Promise<string | null> {
    const [user, gamePlan] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          squadRole: true,
          squad: {
            select: {
              leaderId: true,
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
        where: { id: gamePlanId },
        select: {
          id: true,
          sideId: true,
        },
      }),
    ]);

    if (!user?.squad?.sideId) {
      return 'You are not a member of a squad';
    }

    const allowedTypes = new Set<SideType>([SideType.BLUE, SideType.RED]);
    if (!allowedTypes.has(user.squad.side.type)) {
      return 'Your side is not eligible for headquarters plans';
    }

    if (!gamePlan) {
      return 'Game plan not found';
    }

    const hasSquadPlanAccess =
      user.squad.leaderId === user.id ||
      user.squadRole === SquadRole.SUBLEADER ||
      user.squadRole === SquadRole.HQ;

    if (!hasSquadPlanAccess) {
      return 'Your squad role does not allow headquarters plan access';
    }

    if (gamePlan.sideId !== user.squad.sideId) {
      return 'Forbidden for this side';
    }

    return null;
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

  emitHqSquadChanged(gamePlanId: string, data: any) {
    this.server.to(`headquarters:plan:${gamePlanId}`).emit('hq_squad_changed', data);
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
