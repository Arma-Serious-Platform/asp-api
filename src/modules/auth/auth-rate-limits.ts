import { RateLimitRule } from 'src/shared/decorators/rate-limit.decorator';
import { getRequestIp } from 'src/shared/utils/request-ip';

const MINUTE = 60;
const HOUR = 60 * MINUTE;

const byIp: RateLimitRule['key'] = (req) => getRequestIp(req) ?? 'unknown';

// Per-IP limits are deliberately loose: behind a proxy that does not forward
// X-Forwarded-For every client shares one IP. Account-scoped counters are the
// main protection, as they do not depend on the client IP at all.
const byBodyField =
  (field: string): RateLimitRule['key'] =>
  (req) => {
    const value = (req.body as Record<string, unknown> | undefined)?.[field];
    return typeof value === 'string' && value.trim()
      ? value.trim().toLowerCase()
      : undefined;
  };

const byUser: RateLimitRule['key'] = (req) => req.userId;

export const LOGIN_RATE_LIMITS: RateLimitRule[] = [
  { name: 'login-ip', limit: 100, windowSeconds: 15 * MINUTE, key: byIp },
  {
    name: 'login-account',
    limit: 10,
    windowSeconds: 15 * MINUTE,
    key: byBodyField('emailOrNickname'),
  },
];

// Per-user 2FA attempts are additionally limited in TwoFactorService.
export const TWO_FACTOR_VERIFY_RATE_LIMITS: RateLimitRule[] = [
  { name: '2fa-verify-ip', limit: 100, windowSeconds: 15 * MINUTE, key: byIp },
];

export const SIGN_UP_RATE_LIMITS: RateLimitRule[] = [
  { name: 'signup-ip', limit: 30, windowSeconds: HOUR, key: byIp },
  {
    name: 'signup-email',
    limit: 3,
    windowSeconds: HOUR,
    key: byBodyField('email'),
  },
];

export const FORGOT_PASSWORD_RATE_LIMITS: RateLimitRule[] = [
  { name: 'forgot-ip', limit: 30, windowSeconds: HOUR, key: byIp },
  {
    name: 'forgot-email',
    limit: 3,
    windowSeconds: HOUR,
    key: byBodyField('email'),
  },
];

export const TOKEN_REDEMPTION_RATE_LIMITS: RateLimitRule[] = [
  { name: 'token-ip', limit: 50, windowSeconds: 15 * MINUTE, key: byIp },
];

export const PASSWORD_CONFIRMATION_RATE_LIMITS: RateLimitRule[] = [
  {
    name: 'password-confirm-user',
    limit: 5,
    windowSeconds: 15 * MINUTE,
    key: byUser,
  },
];

export const TWO_FACTOR_ENABLE_RATE_LIMITS: RateLimitRule[] = [
  {
    name: '2fa-enable-user',
    limit: 10,
    windowSeconds: 15 * MINUTE,
    key: byUser,
  },
];
