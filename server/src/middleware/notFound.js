import { NotFoundError } from '../utils/errors/index.js';

export function notFound(req, _res, next) {
  next(new NotFoundError(`Route ${req.method} ${req.path} does not exist`));
}
