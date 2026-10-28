import {
  decryptOidcClientSecret,
  encryptOidcClientSecret,
  generateOidcClientSecret,
} from './oidc-secret-crypto';

describe('OIDC client secret encryption', () => {
  const originalKey = process.env.OIDC_CLIENT_SECRET_KEY;

  beforeEach(() => {
    process.env.OIDC_CLIENT_SECRET_KEY = 'ab'.repeat(32);
  });

  afterAll(() => {
    process.env.OIDC_CLIENT_SECRET_KEY = originalKey;
  });

  it('round-trips a secret without storing it in plain text', () => {
    const secret = generateOidcClientSecret();
    const encrypted = encryptOidcClientSecret(secret);

    expect(encrypted).not.toContain(secret);
    expect(encryptOidcClientSecret(secret)).not.toBe(encrypted);
    expect(decryptOidcClientSecret(encrypted)).toBe(secret);
  });

  it('detects tampering', () => {
    const [iv, tag, data] = encryptOidcClientSecret('secret').split(':');
    const flipped = `${data.slice(0, -1)}${data.endsWith('0') ? '1' : '0'}`;

    expect(() => decryptOidcClientSecret(`${iv}:${tag}:${flipped}`)).toThrow();
  });

  it('refuses a missing or malformed key', () => {
    process.env.OIDC_CLIENT_SECRET_KEY = 'not-hex';
    expect(() => encryptOidcClientSecret('secret')).toThrow(/OIDC_CLIENT_SECRET_KEY/);
  });
});
