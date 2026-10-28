export type InteractionStep =
  /** Nobody is signed in to VTG, or the client asked for a fresh login. */
  | 'login'
  /** The user has to allow the client the requested scopes. */
  | 'consent'
  /** Nothing to ask: finish the interaction and return to the client. */
  | 'continue';

/**
 * What the user has to do before returning to the client. Our own apps
 * (first party) and scopes allowed before need no consent screen, unless a
 * third-party client asks for it with `prompt=consent`. A third-party app
 * the user never allowed always asks, even for `openid` alone: who the user
 * is on VTG is itself what it gets.
 */
export function decideInteractionStep(params: {
  signedIn: boolean;
  reauthenticationRequired: boolean;
  firstParty: boolean;
  consentRequested: boolean;
  requestedScopes: string[];
  /** Null when the user never allowed this app. */
  grantedScopes: string[] | null;
}): InteractionStep {
  if (!params.signedIn || params.reauthenticationRequired) {
    return 'login';
  }

  if (params.firstParty) {
    return 'continue';
  }

  if (params.consentRequested || params.grantedScopes === null) {
    return 'consent';
  }

  const granted = new Set(params.grantedScopes);

  return params.requestedScopes.every((scope) => granted.has(scope))
    ? 'continue'
    : 'consent';
}

export function isConsentRequested(params: { prompt?: unknown }) {
  return (
    typeof params.prompt === 'string' &&
    params.prompt.split(' ').includes('consent')
  );
}

/**
 * Scopes to grant: the requested ones the client is registered for. `openid`
 * is always first, the provider would not proceed without it.
 */
export function resolveGrantableScopes(
  requested: string | undefined,
  allowed: string | undefined,
) {
  const allowedSet = new Set((allowed ?? '').split(' ').filter(Boolean));
  const scopes = (requested ?? '')
    .split(' ')
    .filter((scope) => scope && scope !== 'openid' && allowedSet.has(scope));

  return ['openid', ...new Set(scopes)];
}

/**
 * True when the client asked for a login newer than the current one:
 * `prompt=login` and the user has not logged in since the interaction
 * started, or `max_age` seconds that have passed since the login.
 */
export function isReauthenticationRequired(
  params: { prompt?: unknown; max_age?: unknown },
  loggedInAt: Date | undefined,
  interactionStartedAt: Date,
  now = new Date(),
) {
  if (!loggedInAt) {
    return false;
  }

  const prompts =
    typeof params.prompt === 'string' ? params.prompt.split(' ') : [];
  if (prompts.includes('login') && loggedInAt < interactionStartedAt) {
    return true;
  }

  const maxAge = Number(params.max_age);
  if (params.max_age === undefined || !Number.isFinite(maxAge)) {
    return false;
  }

  return now.getTime() - loggedInAt.getTime() > maxAge * 1000;
}
