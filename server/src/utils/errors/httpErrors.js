import { ERROR_CODE, HTTP_STATUS } from '../../constants/index.js';
import { AppError } from './AppError.js';

export class ValidationError extends AppError {
  constructor(message = 'Request validation failed', details) {
    super(message, {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: ERROR_CODE.VALIDATION_FAILED,
      details,
    });
  }
}

export class MalformedRequestError extends AppError {
  constructor(message = 'Request body could not be parsed') {
    super(message, { statusCode: HTTP_STATUS.BAD_REQUEST, code: ERROR_CODE.MALFORMED_REQUEST });
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = 'This link is invalid or has expired') {
    super(message, { statusCode: HTTP_STATUS.BAD_REQUEST, code: ERROR_CODE.INVALID_TOKEN });
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, { statusCode: HTTP_STATUS.UNAUTHORIZED, code: ERROR_CODE.UNAUTHENTICATED });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource', code = ERROR_CODE.FORBIDDEN) {
    super(message, { statusCode: HTTP_STATUS.FORBIDDEN, code });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, { statusCode: HTTP_STATUS.NOT_FOUND, code: ERROR_CODE.NOT_FOUND });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details, code = ERROR_CODE.CONFLICT) {
    super(message, { statusCode: HTTP_STATUS.CONFLICT, code, details });
  }
}

export class UnprocessableError extends AppError {
  constructor(message, code, details) {
    super(message, { statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY, code, details });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please slow down') {
    super(message, {
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      code: ERROR_CODE.RATE_LIMITED,
    });
  }
}

/** A downstream service (payment gateway, mail server) failed; the cause is logged, not shown. */
export class UpstreamError extends AppError {
  constructor(message, code, cause) {
    super(message, { statusCode: HTTP_STATUS.BAD_GATEWAY, code, cause });
    this.expose = true;
  }
}
