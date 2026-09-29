import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SESSION_COOKIE_NAME } from 'src/modules/auth/auth.constants';
import { parseCookieHeader } from 'src/shared/utils/cookies';

// Gateways store the authenticated user id on the socket in handleConnection.
type UserSocket = Socket & { userId?: string };

type SocketNamespace = { sockets: Map<string, Socket> };

type Listener = () => Promise<void>;

/**
 * Lets HTTP-side services revoke realtime access: sockets are authenticated
 * once at connect time, so they must be dropped explicitly when the session,
 * password or permissions behind them change.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly namespaces = new Set<SocketNamespace>();
  private readonly squadMembershipListeners = new Set<Listener>();

  registerNamespace(namespace: SocketNamespace) {
    this.namespaces.add(namespace);
  }

  /** Disconnects every socket of the user, optionally keeping one session. */
  disconnectUser(userId: string, options: { exceptSessionId?: string } = {}) {
    this.disconnectWhere(
      (socket) =>
        socket.userId === userId &&
        (!options.exceptSessionId ||
          this.getSessionId(socket) !== options.exceptSessionId),
    );
  }

  /** Disconnects sockets opened with the given session cookie. */
  disconnectSession(sessionId: string) {
    this.disconnectWhere((socket) => this.getSessionId(socket) === sessionId);
  }

  onSquadMembershipChanged(listener: Listener) {
    this.squadMembershipListeners.add(listener);
  }

  /** Call after any change to squad membership, squad roles or squad sides. */
  squadMembershipChanged() {
    for (const listener of this.squadMembershipListeners) {
      listener().catch((error) =>
        this.logger.error(`Squad membership listener failed: ${String(error)}`),
      );
    }
  }

  private disconnectWhere(predicate: (socket: UserSocket) => boolean) {
    for (const namespace of this.namespaces) {
      for (const socket of namespace.sockets.values()) {
        if (predicate(socket as UserSocket)) {
          socket.disconnect(true);
        }
      }
    }
  }

  private getSessionId(socket: Socket) {
    return parseCookieHeader(socket.handshake.headers.cookie)[
      SESSION_COOKIE_NAME
    ];
  }
}
