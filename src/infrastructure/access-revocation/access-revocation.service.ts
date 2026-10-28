import { Injectable, Logger } from '@nestjs/common';

export type AccessRevocationEvent =
  /** One UserSession ended: logout or revoked from the sessions list. */
  | { type: 'session'; sessionId: string }
  /**
   * Everything the user was issued is cut off (password change or reset,
   * permanent ban, deletion), except what was derived from `exceptSessionId`.
   */
  | { type: 'user'; userId: string; exceptSessionId?: string };

type Listener = (event: AccessRevocationEvent) => Promise<void>;

/**
 * Lets modules that hand out access derived from a UserSession (OIDC grants
 * of connected apps) drop it when the session or the user's access is
 * revoked, without the auth code depending on them.
 */
@Injectable()
export class AccessRevocationService {
  private readonly logger = new Logger(AccessRevocationService.name);
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
  }

  // Listener failures are logged, never thrown: revoking access on the
  // platform itself must not fail because a connected app could not be told.
  async publish(event: AccessRevocationEvent) {
    for (const listener of this.listeners) {
      try {
        await listener(event);
      } catch (error) {
        this.logger.error(
          `Access revocation listener failed for ${event.type} event`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
