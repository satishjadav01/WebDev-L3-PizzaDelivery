import jwt from 'jsonwebtoken';
import { SECOND_MS } from '../../config/units.js';
import { generateToken, hashToken } from '../utils/crypto.js';
import { UnauthenticatedError } from '../utils/errors/index.js';

/**
 * Two kinds of tokens live here: signed JWT access tokens (stateless, checked on every
 * request) and one-time tokens for email links (stored hashed, consumed exactly once).
 */
export function createTokenService({ env, authConfig, tokenRepository, clock }) {
  const { jwt: jwtConfig, oneTimeTokens } = authConfig;

  return {
    issueAccessToken({ userId, role }) {
      const token = jwt.sign({ role }, env.JWT_SECRET, {
        algorithm: jwtConfig.algorithm,
        issuer: jwtConfig.issuer,
        subject: String(userId),
        expiresIn: Math.floor(jwtConfig.accessTtlMs / SECOND_MS),
      });
      return { token, expiresInMs: jwtConfig.accessTtlMs };
    },

    verifyAccessToken(token) {
      try {
        const payload = jwt.verify(token, env.JWT_SECRET, {
          algorithms: [jwtConfig.algorithm],
          issuer: jwtConfig.issuer,
        });
        return { userId: payload.sub, role: payload.role };
      } catch {
        throw new UnauthenticatedError('Session is invalid or has expired');
      }
    },

    /** Returns the raw token (for the email link); only its hash is persisted. */
    async issueOneTimeToken({ userId, type, ttlMs }) {
      const raw = generateToken(oneTimeTokens.byteLength);
      await tokenRepository.create({
        user: userId,
        type,
        tokenHash: hashToken(raw),
        expiresAt: new Date(clock.now().getTime() + ttlMs),
      });
      return raw;
    },

    /** Resolves to the owning user id, or null when the token is unknown, used or expired. */
    async consumeOneTimeToken({ raw, type }) {
      const record = await tokenRepository.consume({
        tokenHash: hashToken(raw),
        type,
        now: clock.now(),
      });
      return record ? record.user : null;
    },
  };
}
