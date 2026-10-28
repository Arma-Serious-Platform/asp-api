import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import type { Grant, Interaction } from 'oidc-provider';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { ResolvedSessionUser } from 'src/modules/auth/auth.service';
import { UserRestrictionsService } from 'src/modules/users/user-restrictions.service';
import { getClientDomain, getUrlHost } from './oidc-client-metadata';
import { OidcConnectedAppsService } from './oidc-connected-apps.service';
import { OidcGrantsService } from './oidc-grants.service';
import {
  InteractionStep,
  decideInteractionStep,
  isConsentRequested,
  isReauthenticationRequired,
  resolveGrantableScopes,
} from './oidc-interaction-decision';
import { OidcProviderService } from './oidc-provider.service';

type InteractionContext = {
  details: Interaction;
  vtgSession: ResolvedSessionUser | null;
  step: InteractionStep;
  scopes: string[];
  client: {
    clientId: string;
    name: string;
    firstParty: boolean;
    domain: string | null;
  };
};

/**
 * Login and consent between the provider and the user. The browser lands on
 * `GET /sso/interactions/:uid`: when the user is signed in to VTG and nothing
 * needs asking, it goes straight back to the client; otherwise to the
 * frontend page, which signs in with the regular VTG login and asks for
 * consent through the JSON endpoints.
 */
@Injectable()
export class OidcInteractionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oidc: OidcProviderService,
    private readonly grants: OidcGrantsService,
    private readonly connectedApps: OidcConnectedAppsService,
    private readonly userRestrictions: UserRestrictionsService,
  ) {}

  /** Where to send the browser that arrived at the interaction URL. */
  async resolveEntry(uid: string, req: Request, res: Response) {
    const context = await this.load(uid, req, res);

    if (context.step === 'continue') {
      return this.finish(context, req, res);
    }

    return `${this.oidc.frontendUrl}/oauth/${encodeURIComponent(uid)}`;
  }

  async getDetails(uid: string, req: Request, res: Response) {
    const { step, scopes, client, vtgSession } = await this.load(uid, req, res);

    const user = vtgSession
      ? await this.prisma.user.findUnique({
          where: { id: vtgSession.userId },
          select: {
            id: true,
            nickname: true,
            email: true,
            avatarUrl: true,
            avatar: { select: { url: true } },
            status: true,
            bannedUntil: true,
          },
        })
      : null;

    return {
      uid,
      step,
      client,
      // `openid` only identifies the user; the page lists what else is shared.
      scopes: scopes.filter((scope) => scope !== 'openid'),
      user: user && {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        avatarUrl: user.avatar?.url ?? user.avatarUrl ?? null,
        accountState: this.userRestrictions.getAccountState(user),
        bannedUntil: user.bannedUntil,
      },
    };
  }

  /** The user allowed the request (or had nothing to allow). */
  async confirm(uid: string, req: Request, res: Response) {
    const context = await this.load(uid, req, res);

    if (!context.vtgSession) {
      throw new UnauthorizedException('Authentication required');
    }

    if (context.step === 'login') {
      throw new BadRequestException('A fresh login is required');
    }

    return { redirectTo: await this.finish(context, req, res) };
  }

  async abort(uid: string, req: Request, res: Response) {
    await this.loadDetails(uid, req, res);

    const redirectTo = await this.oidc.provider.interactionResult(
      req,
      res,
      {
        error: 'access_denied',
        error_description: 'End-User aborted interaction',
      },
      { mergeWithLastSubmission: false },
    );

    return { redirectTo };
  }

  private async loadDetails(uid: string, req: Request, res: Response) {
    let details: Interaction;
    try {
      details = await this.oidc.provider.interactionDetails(req, res);
    } catch {
      throw new NotFoundException('Login request not found or expired');
    }

    if (details.uid !== uid) {
      throw new NotFoundException('Login request not found or expired');
    }

    return details;
  }

  private async load(
    uid: string,
    req: Request,
    res: Response,
  ): Promise<InteractionContext> {
    const details = await this.loadDetails(uid, req, res);
    const clientId = String(details.params.client_id);

    const [client, providerClient, vtgSession] = await Promise.all([
      this.prisma.oidcClient.findUnique({ where: { clientId } }),
      this.oidc.provider.Client.find(clientId),
      this.oidc.resolveVtgSession(req.headers.cookie),
    ]);

    if (!client || !providerClient) {
      throw new NotFoundException('Login request not found or expired');
    }

    const scopes = resolveGrantableScopes(
      details.params.scope as string | undefined,
      ['openid', ...client.allowedScopes].join(' '),
    );
    const grantedScopes = vtgSession
      ? await this.connectedApps.findGrantedScopes(vtgSession.userId, clientId)
      : null;

    const step = decideInteractionStep({
      signedIn: Boolean(vtgSession),
      reauthenticationRequired: isReauthenticationRequired(
        details.params,
        vtgSession?.loggedInAt,
        new Date((details.iat ?? 0) * 1000),
      ),
      firstParty: client.firstParty,
      consentRequested: isConsentRequested(details.params),
      requestedScopes: scopes.filter((scope) => scope !== 'openid'),
      grantedScopes,
    });

    return {
      details,
      vtgSession,
      step,
      scopes,
      client: {
        clientId,
        name: client.name,
        firstParty: client.firstParty,
        // Where this sign-in returns to: the user trusts that host, not the
        // first one the client happens to have registered.
        domain:
          getUrlHost(details.params.redirect_uri) ?? getClientDomain(client),
      },
    };
  }

  /**
   * Grants the scopes from the current VTG session and hands the result to
   * the provider. Returns the URL that continues the authorization.
   */
  private async finish(
    context: InteractionContext,
    req: Request,
    res: Response,
  ) {
    const { details, scopes, client } = context;
    const vtgSession = context.vtgSession as ResolvedSessionUser;
    const { Grant } = this.oidc.provider;

    // A grant authorized by another VTG session must not be reused: it would
    // outlive that session's logout.
    let grant: Grant | undefined;
    if (details.grantId) {
      const existing = await Grant.find(details.grantId);
      const session = existing
        ? await this.oidc.resolveGrantSession(details.grantId)
        : null;

      if (
        existing &&
        existing.accountId === vtgSession.userId &&
        session?.sessionId === vtgSession.sessionId
      ) {
        grant = existing;
      } else {
        await this.prisma.oidcPayload.deleteMany({
          where: { grantId: details.grantId },
        });
      }
    }

    grant ??= new Grant({
      accountId: vtgSession.userId,
      clientId: client.clientId,
    });
    grant.addOIDCScope(scopes.join(' '));

    // Requested but not allowed for this client: marked as declined so the
    // provider leaves them out instead of asking again.
    const requested =
      typeof details.params.scope === 'string' ? details.params.scope : '';
    const declined = requested
      .split(' ')
      .filter((scope) => scope && !scopes.includes(scope));
    if (declined.length) {
      grant.rejectOIDCScope(declined.join(' '));
    }

    const grantId = await grant.save();
    await this.grants.linkToSession(grantId, vtgSession.sessionId);
    await this.connectedApps.recordConsent(
      vtgSession.userId,
      client.clientId,
      scopes.filter((scope) => scope !== 'openid'),
    );

    return this.oidc.provider.interactionResult(
      req,
      res,
      {
        login: {
          accountId: vtgSession.userId,
          ts: Math.floor(vtgSession.loggedInAt.getTime() / 1000),
          remember: true,
        },
        consent: { grantId },
      },
      { mergeWithLastSubmission: false },
    );
  }
}
