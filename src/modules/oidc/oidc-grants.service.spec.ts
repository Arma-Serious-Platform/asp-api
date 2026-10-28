import { OidcGrantsService } from './oidc-grants.service';

// The real provider module loads oidc-provider, which is ESM only.
jest.mock('./oidc-provider.service', () => ({ OidcProviderService: class {} }));

describe('OidcGrantsService.revokeForEndedSessions', () => {
  const prisma = {
    oidcPayload: { findMany: jest.fn(), deleteMany: jest.fn() },
    userSession: { findMany: jest.fn() },
  };
  const service = new OidcGrantsService(
    prisma as never,
    { enabled: false } as never,
    { subscribe: jest.fn() } as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('revokes the grants of sessions that expired or were revoked', async () => {
    prisma.oidcPayload.findMany
      .mockResolvedValueOnce([{ aspSessionId: 'live' }, { aspSessionId: 'gone' }])
      .mockResolvedValueOnce([
        { id: 'grant-gone', accountId: 'user-1', payload: { clientId: 'vtg_a' } },
      ]);
    prisma.userSession.findMany.mockResolvedValue([{ id: 'live' }]);

    await service.revokeForEndedSessions();

    expect(prisma.oidcPayload.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { aspSessionId: { in: ['gone'] }, type: 'Grant' },
      }),
    );
    expect(prisma.oidcPayload.deleteMany).toHaveBeenCalledWith({
      where: { grantId: { in: ['grant-gone'] } },
    });
  });

  it('leaves grants of live sessions alone', async () => {
    prisma.oidcPayload.findMany.mockResolvedValueOnce([{ aspSessionId: 'live' }]);
    prisma.userSession.findMany.mockResolvedValue([{ id: 'live' }]);

    await service.revokeForEndedSessions();

    expect(prisma.oidcPayload.deleteMany).not.toHaveBeenCalled();
  });
});
