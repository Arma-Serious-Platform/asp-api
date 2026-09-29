export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'sessionId';

export const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 7);

export const SESSION_MAX_AGE_DAYS = Number(process.env.SESSION_MAX_AGE_DAYS ?? 30);

// Access and refresh JWTs carry `tokenType`. Any other JWT signed with the same
// JWT_SECRET (2FA login, Steam link) has no such claim and must be rejected
// wherever an access or refresh token is expected.
export const JWT_ACCESS_TOKEN_TYPE = 'access';

export const JWT_REFRESH_TOKEN_TYPE = 'refresh';
