// Prints fresh OIDC secrets as .env lines. Nothing is written to disk:
// copy the output into the deployment's environment.
//
//   node scripts/oidc-generate-keys.js
//
// OIDC_JWKS: private RS256 signing key(s), the algorithm every OpenID Connect
// client supports. To rotate, generate a new key and put it FIRST in the
// "keys" array, keeping the old one after it until every token it signed has
// expired.
const { generateKeyPairSync, randomBytes, randomUUID } = require('crypto');

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = {
  ...privateKey.export({ format: 'jwk' }),
  kid: randomUUID(),
  alg: 'RS256',
  use: 'sig',
};

const cookieKeys = [randomBytes(32).toString('hex'), randomBytes(32).toString('hex')];

console.log(`OIDC_JWKS='${JSON.stringify({ keys: [jwk] })}'`);
console.log(`OIDC_COOKIE_KEYS=${cookieKeys.join(',')}`);
console.log(`OIDC_CLIENT_SECRET_KEY=${randomBytes(32).toString('hex')}`);
