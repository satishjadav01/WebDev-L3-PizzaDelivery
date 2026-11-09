import { rateLimit } from 'express-rate-limit';
import { TooManyRequestsError } from '../utils/errors/index.js';

/** Builds a limiter from a `{ windowMs, limit }` policy defined in security config. */
export function createRateLimiter({ windowMs, limit }, { standardHeaders }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders,
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new TooManyRequestsError()),
  });
}
