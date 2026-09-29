import { createHash, randomBytes } from 'crypto';

const KEY_PREFIX = 'asp_';
const KEY_BYTES = 32;
const DISPLAY_PREFIX_LENGTH = 12;

export function generateApiKey(): { key: string; keyPrefix: string; keyHash: string } {
  const key = `${KEY_PREFIX}${randomBytes(KEY_BYTES).toString('hex')}`;
  return {
    key,
    keyPrefix: key.slice(0, DISPLAY_PREFIX_LENGTH),
    keyHash: hashApiKey(key),
  };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
