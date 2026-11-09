import { ERROR_CODE, HTTP_STATUS } from '../../constants/index.js';

/**
 * Base class for errors we raise on purpose. `expose` marks messages that are safe
 * to show to clients; anything else is replaced by a generic message at the edge.
 */
export class AppError extends Error {
  constructor(message, { statusCode, code, details, cause } = {}) {
    super(message, { cause });
    this.name = this.constructor.name;
    this.statusCode = statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
    this.code = code ?? ERROR_CODE.INTERNAL;
    this.details = details;
    this.expose = this.statusCode < HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }
}
