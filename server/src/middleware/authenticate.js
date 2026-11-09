import { UnauthenticatedError } from '../utils/errors/index.js';

const BEARER_PREFIX = /^Bearer\s+(.+)$/i;

/** Requires a valid access token and exposes `req.auth = { userId, role }`. */
export function createAuthenticate({ tokenService }) {
  return (req, _res, next) => {
    const match = BEARER_PREFIX.exec(req.headers.authorization ?? '');
    if (!match) return next(new UnauthenticatedError());
    try {
      req.auth = tokenService.verifyAccessToken(match[1]);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
