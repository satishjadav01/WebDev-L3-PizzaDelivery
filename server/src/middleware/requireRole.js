import { ForbiddenError, UnauthenticatedError } from '../utils/errors/index.js';

/** Must run after `authenticate`. Allows the request only for the listed roles. */
export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.auth) return next(new UnauthenticatedError());
    if (!allowedRoles.includes(req.auth.role)) return next(new ForbiddenError());
    return next();
  };
}
