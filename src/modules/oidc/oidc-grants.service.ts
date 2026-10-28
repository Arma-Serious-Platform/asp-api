import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import type { Client } from 'oidc-provider';
import { AccessRevocationService } from 'src/infrastructure/access-revocation/access-revocation.service';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { OidcProviderService } from './oidc-provider.service';

/**
 * Grants tie a user's consent for a client to the VTG session that gave it.
 * Revoking a grant removes it with every code and token issued from it and
 * tells the client through back-channel logout.
 */
@Injectable()
export class OidcGrantsService implements OnModuleInit {
  private readonly logger = new Logger(OidcGrantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly oidc: OidcProviderService,
    private readonly accessRevocation: AccessRevocationService,
  ) {}

  onModuleInit() {
    this.accessRevocation.subscribe(async (event) => {
      if (event.type === 'session') {
        await this.revokeForSession(event.sessionId);
      } else {
        await this.revokeForUser(event.userId, event.exceptSessionId);
      }
    });
  }

  async linkToSession(grantId: string, aspSessionId: string) {
    await this.prisma.oidcPayload.update({
      where: { type_id: { type: 'Grant', id: grantId } },
      data: { aspSessionId },
    });
  }

  revokeForSession(aspSessionId: string) {
    return this.revoke({ aspSessionId });
  }

  async revokeForUser(userId: string, exceptSessionId?: string) {
    await this.revoke({
      accountId: userId,
      ...(exceptSessionId && {
        OR: [
          { aspSessionId: null },
          { aspSessionId: { not: exceptSessionId } },
        ],
      }),
    });

    // The provider's browser sessions are useless without a VTG session, but
    // when nothing of the user's access is kept there is no reason to keep
    // them either.
    if (!exceptSessionId) {
      await this.prisma.oidcPayload.deleteMany({
        where: { type: 'Session', accountId: userId },
      });
    }
  }

  revokeForUserAndClient(userId: string, clientId: string) {
    return this.revoke({
      accountId: userId,
      payload: { path: ['clientId'], equals: clientId },
    });
  }

  revokeForClient(clientId: string) {
    return this.revoke({ payload: { path: ['clientId'], equals: clientId } });
  }

  /** Revokes the matching grants; `where` is applied to Grant rows. */
  private async revoke(where: Prisma.OidcPayloadWhereInput) {
    const grants = await this.prisma.oidcPayload.findMany({
      where: { ...where, type: 'Grant' },
      select: { id: true, accountId: true, payload: true },
    });

    if (!grants.length) {
      return;
    }

    await this.prisma.oidcPayload.deleteMany({
      where: { grantId: { in: grants.map((grant) => grant.id) } },
    });

    const logouts = new Map<string, { accountId: string; clientId: string }>();
    for (const grant of grants) {
      const clientId = (grant.payload as { clientId?: string }).clientId;
      if (grant.accountId && clientId) {
        logouts.set(`${grant.accountId}:${clientId}`, {
          accountId: grant.accountId,
          clientId,
        });
      }
    }

    if (!this.oidc.enabled) {
      return;
    }

    for (const { accountId, clientId } of logouts.values()) {
      // Loaded now, while the client still exists and is enabled (it may be
      // disabled or deleted right after this returns).
      // backchannelLogout exists on clients but is missing from the typings.
      const client = (await this.oidc.provider.Client.find(clientId)) as
        | (Client & {
            backchannelLogout(sub: string, sid: string): Promise<void>;
          })
        | undefined;

      // Not awaited: a slow or unreachable app must not hold up a logout.
      // Its tokens are already gone, so it loses access either way.
      if (client?.backchannelLogoutUri) {
        void client.backchannelLogout(accountId, '').catch((error: unknown) =>
          this.logger.warn(
            `Back-channel logout to ${clientId} failed: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async removeExpired() {
    await this.prisma.oidcPayload.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    await this.revokeForEndedSessions();
  }

  /**
   * Sessions that simply expired send no revocation event. Their tokens are
   * refused anyway, but introspection would still call them active; this
   * cleans them up and tells the apps.
   */
  async revokeForEndedSessions() {
    const linked = await this.prisma.oidcPayload.findMany({
      where: { type: 'Grant', aspSessionId: { not: null } },
      distinct: ['aspSessionId'],
      select: { aspSessionId: true },
    });
    const sessionIds = linked.map((grant) => grant.aspSessionId as string);
    if (!sessionIds.length) {
      return;
    }

    const live = await this.prisma.userSession.findMany({
      where: {
        id: { in: sessionIds },
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    const liveIds = new Set(live.map((session) => session.id));
    const ended = sessionIds.filter((id) => !liveIds.has(id));

    if (ended.length) {
      await this.revoke({ aspSessionId: { in: ended } });
    }
  }
}
