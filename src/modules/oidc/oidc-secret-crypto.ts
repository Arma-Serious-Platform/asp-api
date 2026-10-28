import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Client secrets are compared in plain text by the provider, so they are
// stored encrypted rather than hashed.
function getEncryptionKey() {
  const keyHex = process.env.OIDC_CLIENT_SECRET_KEY;

  if (!keyHex || !/^[0-9a-f]{64}$/i.test(keyHex)) {
    throw new Error('OIDC_CLIENT_SECRET_KEY must be a 32-byte hex string');
  }

  return Buffer.from(keyHex, 'hex');
}

export function generateOidcClientSecret() {
  return randomBytes(32).toString('base64url');
}

export function encryptOidcClientSecret(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptOidcClientSecret(payload: string) {
  const [ivHex, authTagHex, encryptedHex] = payload.split(':');

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid encrypted client secret');
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}
