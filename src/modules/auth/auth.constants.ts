export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'sessionId';

export const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 7);

export const SESSION_MAX_AGE_DAYS = Number(process.env.SESSION_MAX_AGE_DAYS ?? 30);
