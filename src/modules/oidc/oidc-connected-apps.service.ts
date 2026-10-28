import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { getClientDomain } from './oidc-client-metadata';
import { OidcGrantsService } from './oidc-grants.service';

/** Apps a user signed in to and the scopes they allowed each of them. */
@Injectable()
export class OidcConnectedAppsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly grants: OidcGrantsService,
  ) {}

  /** Null when the user never allowed this app. */
  async findGrantedScopes(userId: string, clientId: string) {
    const consent = await this.prisma.oidcConsent.findUnique({
      where: { userId_clientId: { userId, clientId } },
      select: { scopes: true },
    });

    return consent?.scopes ?? null;
  }

  /** Remembers the scopes, adding to what was allowed before. */
  async recordConsent(userId: string, clientId: string, scopes: string[]) {
    const previous = (await this.findGrantedScopes(userId, clientId)) ?? [];
    const merged = [...new Set([...previous, ...scopes])];

    await this.prisma.oidcConsent.upsert({
      where: { userId_clientId: { userId, clientId } },
      create: { userId, clientId, scopes: merged },
      update: { scopes: merged, lastUsedAt: new Date() },
    });
  }

  async list(userId: string) {
    const consents = await this.prisma.oidcConsent.findMany({
      where: { userId, client: { disabled: false } },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        scopes: true,
        lastUsedAt: true,
        createdAt: true,
        client: {
          select: {
            clientId: true,
            name: true,
            firstParty: true,
            redirectUris: true,
          },
        },
      },
    });

    return consents.map(({ client, ...consent }) => ({
      clientId: client.clientId,
      name: client.name,
      firstParty: client.firstParty,
      domain: getClientDomain(client),
      scopes: consent.scopes,
      lastUsedAt: consent.lastUsedAt,
      grantedAt: consent.createdAt,
    }));
  }

  /** Signs the user out of the app and forgets the consent. */
  async revoke(userId: string, clientId: string) {
    const { count } = await this.prisma.oidcConsent.deleteMany({
      where: { userId, clientId },
    });

    if (!count) {
      throw new NotFoundException('Connected app not found');
    }

    await this.grants.revokeForUserAndClient(userId, clientId);

    return { clientId };
  }
}
