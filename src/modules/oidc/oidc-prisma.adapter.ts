import type { Prisma, PrismaClient } from '@prisma/client';
import type { Adapter, AdapterPayload } from 'oidc-provider';

type OidcPayloadStore = Pick<PrismaClient, 'oidcPayload'>;

export type ClientLoader = (
  clientId: string,
) => Promise<AdapterPayload | undefined>;

/**
 * Builds the provider's storage adapter: one table for every model, keyed by
 * (type, id). Clients are not stored here; they come from OidcClient through
 * `loadClient`.
 */
export function createOidcAdapter(
  prisma: OidcPayloadStore,
  loadClient: ClientLoader,
) {
  const findOne = async (where: Prisma.OidcPayloadWhereInput) => {
    const row = await prisma.oidcPayload.findFirst({ where });

    if (!row || (row.expiresAt && row.expiresAt <= new Date())) {
      return undefined;
    }

    return {
      ...(row.payload as AdapterPayload),
      ...(row.consumedAt
        ? { consumed: Math.floor(row.consumedAt.getTime() / 1000) }
        : {}),
    };
  };

  return class PrismaOidcAdapter implements Adapter {
    constructor(readonly type: string) {}

    async upsert(id: string, payload: AdapterPayload, expiresIn?: number) {
      const data = {
        payload: payload as Prisma.InputJsonValue,
        // A grant is its own grantId, so revoking by grantId removes it
        // together with every token and code issued from it.
        grantId: this.type === 'Grant' ? id : (payload.grantId ?? null),
        uid: payload.uid ?? null,
        userCode: payload.userCode ?? null,
        accountId: payload.accountId ?? null,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      };

      await prisma.oidcPayload.upsert({
        where: { type_id: { type: this.type, id } },
        create: { type: this.type, id, ...data },
        update: data,
      });
    }

    async find(id: string) {
      if (this.type === 'Client') {
        return loadClient(id);
      }

      return findOne({ type: this.type, id });
    }

    findByUid(uid: string) {
      return findOne({ type: this.type, uid });
    }

    findByUserCode(userCode: string) {
      return findOne({ type: this.type, userCode });
    }

    async consume(id: string) {
      await prisma.oidcPayload.updateMany({
        where: { type: this.type, id },
        data: { consumedAt: new Date() },
      });
    }

    async destroy(id: string) {
      await prisma.oidcPayload.deleteMany({ where: { type: this.type, id } });
    }

    async revokeByGrantId(grantId: string) {
      await prisma.oidcPayload.deleteMany({
        where: { type: this.type, grantId },
      });
    }
  };
}
