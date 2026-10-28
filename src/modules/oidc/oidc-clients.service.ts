import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { CreateOidcClientDto } from './dto/create-oidc-client.dto';
import { UpdateOidcClientDto } from './dto/update-oidc-client.dto';
import { getClientUrlProblem } from './oidc-client-metadata';
import { OidcGrantsService } from './oidc-grants.service';
import { OidcProviderService } from './oidc-provider.service';
import {
  encryptOidcClientSecret,
  generateOidcClientSecret,
} from './oidc-secret-crypto';

/** Applications registered by administrators to sign users in through VTG. */
@Injectable()
export class OidcClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly grants: OidcGrantsService,
    private readonly oidc: OidcProviderService,
  ) {}

  /** What the app's developers need besides the client ID and secret. */
  private get discoveryUrl() {
    return this.oidc.config
      ? `${this.oidc.config.issuer}/.well-known/openid-configuration`
      : null;
  }

  private readonly publicSelect = {
    id: true,
    clientId: true,
    name: true,
    clientSecretEncrypted: true,
    redirectUris: true,
    postLogoutRedirectUris: true,
    backchannelLogoutUri: true,
    allowedScopes: true,
    firstParty: true,
    disabled: true,
    createdAt: true,
    updatedAt: true,
    createdBy: { select: { id: true, nickname: true } },
  } as const;

  // The secret is never returned after creation or rotation; only whether
  // the client has one.
  private toPublic<T extends { clientSecretEncrypted: string | null }>(
    client: T,
  ) {
    const { clientSecretEncrypted, ...rest } = client;
    return { ...rest, confidential: clientSecretEncrypted !== null };
  }

  private assertUrls(urls: (string | null | undefined)[]) {
    const problems = urls
      .filter((url): url is string => Boolean(url))
      .map(getClientUrlProblem)
      .filter((problem): problem is string => problem !== null);

    if (problems.length) {
      throw new BadRequestException(problems);
    }
  }

  async findAll() {
    const clients = await this.prisma.oidcClient.findMany({
      select: this.publicSelect,
      orderBy: { createdAt: 'desc' },
    });

    return clients.map((client) => this.toPublic(client));
  }

  async create(dto: CreateOidcClientDto, createdById: string) {
    const postLogoutRedirectUris = dto.postLogoutRedirectUris ?? [];
    this.assertUrls([
      ...dto.redirectUris,
      ...postLogoutRedirectUris,
      dto.backchannelLogoutUri,
    ]);

    const clientSecret =
      dto.confidential === false ? null : generateOidcClientSecret();

    const client = await this.prisma.oidcClient.create({
      data: {
        clientId: `vtg_${randomBytes(12).toString('hex')}`,
        name: dto.name.trim(),
        clientSecretEncrypted: clientSecret
          ? encryptOidcClientSecret(clientSecret)
          : null,
        redirectUris: dto.redirectUris,
        postLogoutRedirectUris,
        backchannelLogoutUri: dto.backchannelLogoutUri ?? null,
        allowedScopes: [...new Set(dto.allowedScopes)],
        firstParty: dto.firstParty ?? false,
        createdById,
      },
      select: this.publicSelect,
    });

    return {
      ...this.toPublic(client),
      clientSecret,
      discoveryUrl: this.discoveryUrl,
    };
  }

  async update(id: string, dto: UpdateOidcClientDto) {
    const existing = await this.findExisting(id);
    this.assertUrls([
      ...(dto.redirectUris ?? []),
      ...(dto.postLogoutRedirectUris ?? []),
      dto.backchannelLogoutUri,
    ]);

    // Before the client is disabled: a disabled client is unknown to the
    // provider, which could then no longer send its back-channel logouts.
    if (dto.disabled && !existing.disabled) {
      await this.grants.revokeForClient(existing.clientId);
    }

    const client = await this.prisma.oidcClient.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        redirectUris: dto.redirectUris,
        postLogoutRedirectUris: dto.postLogoutRedirectUris,
        backchannelLogoutUri: dto.backchannelLogoutUri,
        allowedScopes: dto.allowedScopes && [...new Set(dto.allowedScopes)],
        firstParty: dto.firstParty,
        disabled: dto.disabled,
      },
      select: this.publicSelect,
    });

    return this.toPublic(client);
  }

  async rotateSecret(id: string) {
    const existing = await this.findExisting(id);

    if (existing.clientSecretEncrypted === null) {
      throw new BadRequestException('Public clients have no secret');
    }

    const clientSecret = generateOidcClientSecret();
    const client = await this.prisma.oidcClient.update({
      where: { id },
      data: { clientSecretEncrypted: encryptOidcClientSecret(clientSecret) },
      select: this.publicSelect,
    });

    return {
      ...this.toPublic(client),
      clientSecret,
      discoveryUrl: this.discoveryUrl,
    };
  }

  async delete(id: string) {
    const existing = await this.findExisting(id);

    await this.grants.revokeForClient(existing.clientId);
    await this.prisma.oidcClient.delete({ where: { id } });

    return { id };
  }

  private async findExisting(id: string) {
    const client = await this.prisma.oidcClient.findUnique({ where: { id } });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }
}
