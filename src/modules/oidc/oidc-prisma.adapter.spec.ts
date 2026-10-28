import { createOidcAdapter } from './oidc-prisma.adapter';

describe('createOidcAdapter', () => {
  const oidcPayload = {
    upsert: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  const loadClient = jest.fn();
  const Adapter = createOidcAdapter({ oidcPayload } as never, loadClient);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores a grant under its own grantId so revoking removes it', async () => {
    await new Adapter('Grant').upsert(
      'grant-1',
      { accountId: 'user-1', clientId: 'vtg_abc' },
      60,
    );

    const { create } = (
      oidcPayload.upsert.mock.calls[0] as [{ create: Record<string, unknown> }]
    )[0];
    expect(create).toMatchObject({
      type: 'Grant',
      id: 'grant-1',
      grantId: 'grant-1',
      accountId: 'user-1',
    });
    expect(create.expiresAt).toBeInstanceOf(Date);
  });

  it('stores tokens with the grant they come from', async () => {
    await new Adapter('AccessToken').upsert('at-1', { grantId: 'grant-1' }, 600);

    expect(oidcPayload.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: 'AccessToken',
          grantId: 'grant-1',
        }) as unknown,
      }),
    );
  });

  it('stores no expiry when the model has none', async () => {
    await new Adapter('AccessToken').upsert('at-2', { grantId: 'grant-1' });

    expect(oidcPayload.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ expiresAt: null, uid: null }) as unknown,
      }),
    );
  });

  it('treats expired rows as missing and reports consumption', async () => {
    const adapter = new Adapter('AuthorizationCode');

    oidcPayload.findFirst.mockResolvedValueOnce({
      payload: { grantId: 'g' },
      expiresAt: new Date(Date.now() - 1000),
      consumedAt: null,
    });
    await expect(adapter.find('expired')).resolves.toBeUndefined();

    const consumedAt = new Date('2026-10-28T12:00:00Z');
    oidcPayload.findFirst.mockResolvedValueOnce({
      payload: { grantId: 'g' },
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt,
    });
    await expect(adapter.find('used')).resolves.toEqual({
      grantId: 'g',
      consumed: Math.floor(consumedAt.getTime() / 1000),
    });
  });

  it('loads clients from the client registry, not the payload table', async () => {
    loadClient.mockResolvedValue({ client_id: 'vtg_abc' });

    await expect(new Adapter('Client').find('vtg_abc')).resolves.toEqual({
      client_id: 'vtg_abc',
    });
    expect(oidcPayload.findFirst).not.toHaveBeenCalled();
  });

  it('revokes by grant within its own model', async () => {
    await new Adapter('RefreshToken').revokeByGrantId('grant-1');

    expect(oidcPayload.deleteMany).toHaveBeenCalledWith({
      where: { type: 'RefreshToken', grantId: 'grant-1' },
    });
  });
});
