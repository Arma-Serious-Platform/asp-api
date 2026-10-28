import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import Provider, {
  interactionPolicy,
  type Configuration,
  type KoaContextWithOIDC,
} from 'oidc-provider';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import {
  AuthService,
  ResolvedSessionUser,
} from 'src/modules/auth/auth.service';
import { SESSION_COOKIE_NAME } from 'src/modules/auth/auth.constants';
import { UserRestrictionsService } from 'src/modules/users/user-restrictions.service';
import { parseCookieHeader } from 'src/shared/utils/cookies';
import {
  OIDC_ACCOUNT_SELECT,
  buildAccountClaims,
  includeRolesClaims,
} from './oidc-claims';
import { toClientMetadata } from './oidc-client-metadata';
import { OidcConfig, loadOidcConfig } from './oidc-config';
import { createOidcAdapter } from './oidc-prisma.adapter';
import { OIDC_SCOPE_CLAIMS, OIDC_TTL } from './oidc.constants';
import {
  renderAutoLogoutPage,
  renderErrorPage,
  renderLogoutPage,
} from './oidc-views';

const { Check } = interactionPolicy;

/**
 * The OpenID Connect provider. A VTG session (UserSession) is the only login:
 * every grant records the session that authorized it, and tokens stop
 * working as soon as that session ends or the account is deleted.
 */
@Injectable()
export class OidcProviderService {
  private readonly logger = new Logger(OidcProviderService.name);
  readonly config: OidcConfig | null;
  private readonly instance: Provider | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly userRestrictions: UserRestrictionsService,
  ) {
    this.config = loadOidcConfig();
    this.instance = this.config ? this.createProvider(this.config) : null;

    if (!this.config) {
      this.logger.log('OIDC_ISSUER is not set: OpenID Connect provider is off');
    }
  }

  get enabled() {
    return this.instance !== null;
  }

  get provider(): Provider {
    if (!this.instance) {
      throw new NotFoundException('OpenID Connect is not configured');
    }

    return this.instance;
  }

  get frontendUrl() {
    if (!this.config) {
      throw new NotFoundException('OpenID Connect is not configured');
    }

    return this.config.frontendUrl;
  }

  interactionUrl(uid: string) {
    return `${this.config?.apiBaseUrl}/sso/interactions/${encodeURIComponent(uid)}`;
  }

  /** The live VTG session behind a Cookie header, if any. */
  async resolveVtgSession(
    cookieHeader: string | undefined,
  ): Promise<ResolvedSessionUser | null> {
    const sessionId = parseCookieHeader(cookieHeader)[SESSION_COOKIE_NAME];

    return sessionId ? this.authService.resolveUserFromSession(sessionId) : null;
  }

  /** The UserSession a grant was authorized with, if it is still live. */
  async resolveGrantSession(grantId: string) {
    const grant = await this.prisma.oidcPayload.findUnique({
      where: { type_id: { type: 'Grant', id: grantId } },
      select: { aspSessionId: true },
    });

    // Apps calling userinfo or refreshing tokens do not keep the browser
    // session alive; only the user's own visits do.
    return grant?.aspSessionId
      ? this.authService.resolveUserFromSession(grant.aspSessionId, {
          touch: false,
        })
      : null;
  }

  private async findAccount(
    ctx: KoaContextWithOIDC,
    sub: string,
    token: { grantId?: string } | undefined,
  ) {
    const account = await this.prisma.user.findUnique({
      where: { id: sub },
      select: OIDC_ACCOUNT_SELECT,
    });

    if (!account) {
      return undefined;
    }

    const state = this.userRestrictions.getAccountState(account);
    if (state === 'deleted') {
      return undefined;
    }

    // Codes and tokens live only as long as the VTG session whose login
    // granted them.
    if (token?.grantId) {
      const session = await this.resolveGrantSession(token.grantId);
      if (!session || session.userId !== account.id) {
        return undefined;
      }
    }

    const muted = this.userRestrictions.isCommunicationMuted(account);
    const firstParty = ctx.oidc?.client?.metadata().first_party === true;

    return {
      accountId: account.id,
      claims: (_use: string, scope: string) =>
        buildAccountClaims(account, state, muted, {
          frontendUrl: this.frontendUrl,
          includeRoles: includeRolesClaims(scope, firstParty),
        }),
    };
  }

  /**
   * Added to the login prompt: the provider's own browser session is only
   * trusted while the VTG session it came from is live and belongs to the
   * same user, and while the client's grant was authorized by that session.
   * Otherwise the user goes through the interaction again, which is silent
   * when the VTG session is fine.
   */
  private readonly vtgSessionCheck = new Check(
    'vtg_session',
    'The VTG session behind this login has ended',
    async (ctx) => {
      const { oidc } = ctx;

      if (!oidc.session?.accountId || oidc.result?.login) {
        return Check.NO_NEED_TO_PROMPT;
      }

      const vtgSession = await this.resolveVtgSession(ctx.get('cookie'));
      if (!vtgSession || vtgSession.userId !== oidc.session.accountId) {
        return Check.REQUEST_PROMPT;
      }

      const grantId = oidc.client
        ? oidc.session.grantIdFor(oidc.client.clientId)
        : undefined;

      if (grantId) {
        const grantSession = await this.resolveGrantSession(grantId);
        if (grantSession?.sessionId !== vtgSession.sessionId) {
          return Check.REQUEST_PROMPT;
        }
      }

      return Check.NO_NEED_TO_PROMPT;
    },
  );

  private async loadClient(clientId: string) {
    const client = await this.prisma.oidcClient.findUnique({
      where: { clientId },
    });

    return client ? toClientMetadata(client) : undefined;
  }

  private async renderLogout(ctx: KoaContextWithOIDC, config: OidcConfig) {
    const { oidc } = ctx;
    const action = oidc.urlFor('end_session_confirm');
    const xsrf = String((oidc.session?.state as { secret?: string }).secret);
    const client = oidc.client;

    ctx.type = 'html';

    // The provider has verified the id_token_hint signature by now, so the
    // request really comes from this client, about this user.
    const hintSubject = (
      oidc.entities.IdTokenHint as { payload?: { sub?: string } } | undefined
    )?.payload?.sub;
    if (
      client &&
      client.metadata().first_party === true &&
      hintSubject !== undefined &&
      hintSubject === oidc.session?.accountId
    ) {
      ctx.body = renderAutoLogoutPage({
        frontendUrl: config.frontendUrl,
        action,
        xsrf,
      });
      return;
    }

    const account = oidc.session?.accountId
      ? await this.prisma.user.findUnique({
          where: { id: oidc.session.accountId },
          select: { nickname: true, email: true },
        })
      : null;

    ctx.body = renderLogoutPage({
      frontendUrl: config.frontendUrl,
      action,
      xsrf,
      clientName: client?.clientName,
      account: account ?? undefined,
    });
  }

  private createProvider(config: OidcConfig) {
    const policy = interactionPolicy.base();
    policy.get('login')?.checks.add(this.vtgSessionCheck);

    const configuration: Configuration = {
      adapter: createOidcAdapter(this.prisma, (clientId) =>
        this.loadClient(clientId),
      ),
      findAccount: (ctx, sub, token) => this.findAccount(ctx, sub, token),
      claims: OIDC_SCOPE_CLAIMS,
      ...(config.allowPrivateNetworkFetch && {
        // Drops the provider's SSRF-protecting dispatcher (see OidcConfig).
        fetch: (url, options) => {
          const { dispatcher: _dispatcher, ...rest } = options as RequestInit & {
            dispatcher?: unknown;
          };
          return fetch(url, rest);
        },
      }),
      jwks: config.jwks,
      cookies: {
        keys: config.cookieKeys,
        long: { signed: true, sameSite: 'lax' },
        short: { signed: true, sameSite: 'lax' },
      },
      responseTypes: ['code'],
      // Browser and mobile apps have no secret, so PKCE is what protects
      // their codes. Server apps authenticate with a secret; PKCE is
      // recommended and checked when sent, but not required, since many
      // libraries (Grafana, Discourse, passport, Socialite…) do not send it
      // by default.
      pkce: { required: (_ctx, client) => client.clientAuthMethod === 'none' },
      // Profile claims also go into the ID token: many libraries (Auth.js,
      // Discourse…) build the user from it and never call userinfo. It is a
      // snapshot of the login moment; userinfo stays the current source.
      conformIdTokenClaims: false,
      allowOmittingSingleRegisteredRedirectUri: false,
      rotateRefreshToken: true,
      ttl: OIDC_TTL,
      extraClientMetadata: {
        properties: ['first_party'],
        validator: (_ctx, key, value) => {
          if (key === 'first_party' && typeof value !== 'boolean') {
            throw new Error('first_party must be a boolean');
          }
        },
      },
      clientBasedCORS: (_ctx, origin, client) =>
        (client.redirectUris ?? []).some(
          (uri) => new URL(uri).origin === origin,
        ),
      interactions: {
        policy,
        url: (_ctx, interaction) => this.interactionUrl(interaction.uid),
      },
      features: {
        devInteractions: { enabled: false },
        userinfo: { enabled: true },
        introspection: {
          enabled: true,
          allowedPolicy: (_ctx, client, token) =>
            !token.clientId || token.clientId === client.clientId,
        },
        revocation: {
          enabled: true,
          allowedPolicy: (_ctx, client, token) =>
            token.clientId === client.clientId,
        },
        backchannelLogout: { enabled: true },
        rpInitiatedLogout: {
          enabled: true,
          logoutSource: (ctx) => this.renderLogout(ctx, config),
          postLogoutSuccessSource: (ctx) => {
            ctx.redirect(`${config.frontendUrl}/`);
          },
        },
      },
      renderError: (ctx, out) => {
        ctx.type = 'html';
        ctx.body = renderErrorPage({
          frontendUrl: config.frontendUrl,
          code: String(out.error),
        });
      },
    };

    const provider = new Provider(config.issuer, configuration);
    // Behind Traefik: trust X-Forwarded-Proto/Host for secure cookies and URLs.
    provider.proxy = true;

    // A full logout ("log out of VTG and every app") ends the VTG session as
    // well. The provider's session object still holds the account after it
    // was destroyed; the VTG session is only ended when it is the same user,
    // because the provider also logs out a stale session of another account
    // when somebody signs in as a different user.
    provider.use(async (ctx, next) => {
      // The logout and error pages must not be framed by another site.
      ctx.set('X-Frame-Options', 'DENY');
      ctx.set('Content-Security-Policy', "frame-ancestors 'none'");

      await next();

      const { oidc } = ctx as KoaContextWithOIDC;
      if (
        oidc?.route === 'end_session_confirm' &&
        ctx.status === 303 &&
        oidc.params?.logout
      ) {
        const vtgSession = await this.resolveVtgSession(ctx.get('cookie'));
        if (vtgSession && vtgSession.userId === oidc.session?.accountId) {
          await this.authService.sessionLogout(
            ctx.req as Request,
            ctx.res as Response,
          );
        }
      }
    });

    provider.on('grant.success', (ctx: KoaContextWithOIDC) => {
      const code = ctx.oidc.entities.AuthorizationCode;
      if (code?.accountId && code.clientId) {
        void this.prisma.oidcConsent
          .updateMany({
            where: { userId: code.accountId, clientId: code.clientId },
            data: { lastUsedAt: new Date() },
          })
          .catch((error: unknown) =>
            this.logger.warn(`Could not record app sign-in: ${String(error)}`),
          );
      }
    });

    provider.on('server_error', (_ctx, error: Error) => {
      this.logger.error(`OIDC server error: ${error.message}`, error.stack);
    });

    provider.on('backchannel.error', (_ctx, error: Error, client) => {
      this.logger.warn(
        `Back-channel logout to ${client?.clientId} failed: ${error.message}`,
      );
    });

    return provider;
  }
}
