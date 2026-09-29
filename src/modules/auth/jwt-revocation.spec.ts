import { isJwtRevoked, nextTokensValidAfter } from './jwt-revocation';

describe('jwt-revocation', () => {
  describe('nextTokensValidAfter', () => {
    it('rounds up to the next whole second', () => {
      expect(nextTokensValidAfter(new Date(1_700_000_000_250)).getTime()).toBe(
        1_700_000_001_000,
      );
    });

    it('keeps an exact second as is', () => {
      expect(nextTokensValidAfter(new Date(1_700_000_000_000)).getTime()).toBe(
        1_700_000_000_000,
      );
    });
  });

  describe('isJwtRevoked', () => {
    const revokedAt = nextTokensValidAfter(new Date(1_700_000_000_250));

    it('accepts any token when the user was never revoked', () => {
      expect(isJwtRevoked(1, null)).toBe(false);
      expect(isJwtRevoked(undefined, undefined)).toBe(false);
    });

    it('rejects tokens issued before or in the same second as the revocation', () => {
      expect(isJwtRevoked(1_699_999_999, revokedAt)).toBe(true);
      expect(isJwtRevoked(1_700_000_000, revokedAt)).toBe(true);
    });

    it('accepts tokens issued after the revocation', () => {
      expect(isJwtRevoked(1_700_000_001, revokedAt)).toBe(false);
    });

    it('rejects tokens without iat once the user was revoked', () => {
      expect(isJwtRevoked(undefined, revokedAt)).toBe(true);
    });
  });
});
