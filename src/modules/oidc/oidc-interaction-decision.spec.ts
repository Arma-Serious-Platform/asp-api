import {
  decideInteractionStep,
  isConsentRequested,
  isReauthenticationRequired,
  resolveGrantableScopes,
} from './oidc-interaction-decision';

describe('decideInteractionStep', () => {
  const base = {
    signedIn: true,
    reauthenticationRequired: false,
    firstParty: false,
    consentRequested: false,
    requestedScopes: ['profile', 'roles'],
    grantedScopes: [] as string[],
  };

  it('asks to log in when nobody is signed in or a fresh login is needed', () => {
    expect(decideInteractionStep({ ...base, signedIn: false })).toBe('login');
    expect(
      decideInteractionStep({
        ...base,
        firstParty: true,
        reauthenticationRequired: true,
      }),
    ).toBe('login');
  });

  it('never asks consent for first-party apps', () => {
    expect(
      decideInteractionStep({ ...base, firstParty: true, consentRequested: true }),
    ).toBe('continue');
  });

  it('asks consent before a new third-party app learns who the user is', () => {
    expect(
      decideInteractionStep({ ...base, requestedScopes: [], grantedScopes: null }),
    ).toBe('consent');
    expect(
      decideInteractionStep({ ...base, requestedScopes: [], grantedScopes: [] }),
    ).toBe('continue');
  });

  it('asks a third-party app consent for scopes not allowed before', () => {
    expect(decideInteractionStep(base)).toBe('consent');
    expect(
      decideInteractionStep({ ...base, grantedScopes: ['profile'] }),
    ).toBe('consent');
    expect(
      decideInteractionStep({ ...base, grantedScopes: ['roles', 'profile', 'game'] }),
    ).toBe('continue');
  });

  it('asks again when a third-party app requests consent explicitly', () => {
    expect(
      decideInteractionStep({
        ...base,
        consentRequested: true,
        grantedScopes: ['profile', 'roles'],
      }),
    ).toBe('consent');
  });
});

describe('resolveGrantableScopes', () => {
  it('keeps the requested scopes the client is registered for', () => {
    expect(
      resolveGrantableScopes(
        'openid profile email roles roles',
        'openid profile roles game',
      ),
    ).toEqual(['openid', 'profile', 'roles']);
  });

  it('always includes openid', () => {
    expect(resolveGrantableScopes(undefined, undefined)).toEqual(['openid']);
  });
});

describe('isConsentRequested', () => {
  it('reads prompt=consent', () => {
    expect(isConsentRequested({ prompt: 'login consent' })).toBe(true);
    expect(isConsentRequested({ prompt: 'login' })).toBe(false);
    expect(isConsentRequested({})).toBe(false);
  });
});

describe('isReauthenticationRequired', () => {
  const started = new Date('2026-10-28T12:00:00Z');
  const now = new Date('2026-10-28T12:05:00Z');

  it('requires a login newer than the interaction for prompt=login', () => {
    expect(
      isReauthenticationRequired(
        { prompt: 'login' },
        new Date('2026-10-28T11:00:00Z'),
        started,
        now,
      ),
    ).toBe(true);
    expect(
      isReauthenticationRequired(
        { prompt: 'login' },
        new Date('2026-10-28T12:01:00Z'),
        started,
        now,
      ),
    ).toBe(false);
  });

  it('honours max_age', () => {
    const loggedIn = new Date('2026-10-28T12:00:00Z');
    expect(isReauthenticationRequired({ max_age: '600' }, loggedIn, started, now)).toBe(
      false,
    );
    expect(isReauthenticationRequired({ max_age: '60' }, loggedIn, started, now)).toBe(
      true,
    );
  });

  it('has nothing to require without a login', () => {
    expect(isReauthenticationRequired({ prompt: 'login' }, undefined, started, now)).toBe(
      false,
    );
  });
});
