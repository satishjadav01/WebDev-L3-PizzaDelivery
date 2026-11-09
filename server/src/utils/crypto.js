import { createHash, randomBytes } from 'node:crypto';

const TOKEN_ENCODING = 'base64url';
const HASH_ALGORITHM = 'sha256';
const HASH_ENCODING = 'hex';

/** Cryptographically random, URL-safe string. */
export function generateToken(byteLength) {
  return randomBytes(byteLength).toString(TOKEN_ENCODING);
}

/** One-way digest used to store tokens; the raw value only ever lives in the email link. */
export function hashToken(rawToken) {
  return createHash(HASH_ALGORITHM).update(rawToken).digest(HASH_ENCODING);
}
