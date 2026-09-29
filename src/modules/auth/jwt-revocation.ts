/**
 * Moment from which JWTs are valid again after a revocation. JWT `iat` has
 * second precision, so round up: tokens issued earlier in the current second
 * (possibly by the attacker the revocation is meant to cut off) stay invalid.
 */
export function nextTokensValidAfter(now: Date = new Date()) {
  return new Date(Math.ceil(now.getTime() / 1000) * 1000);
}

/** True if a JWT with this `iat` was issued before the user's last revocation. */
export function isJwtRevoked(
  issuedAt: number | undefined,
  tokensValidAfter: Date | null | undefined,
) {
  if (!tokensValidAfter) {
    return false;
  }

  return issuedAt === undefined || issuedAt * 1000 < tokensValidAfter.getTime();
}
