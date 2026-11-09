import { ERROR_CODE, HTTP_STATUS, MONGO_DUPLICATE_KEY_CODE } from '../constants/index.js';
import { AppError, ConflictError, MalformedRequestError } from '../utils/errors/index.js';

/** Translates library errors into our own types so the response shape stays uniform. */
function normalise(error) {
  if (error instanceof AppError) return error;
  if (error?.type === 'entity.parse.failed') return new MalformedRequestError();
  if (error?.code === MONGO_DUPLICATE_KEY_CODE) {
    return new ConflictError('Resource already exists', {
      fields: Object.keys(error.keyValue ?? {}),
    });
  }
  return error;
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const known = normalise(error);
  const isAppError = known instanceof AppError;
  const statusCode = isAppError ? known.statusCode : HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const expose = isAppError && known.expose;

  if (statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    req.log.error({ err: error }, 'unhandled request error');
  }

  res.status(statusCode).json({
    error: {
      code: isAppError ? known.code : ERROR_CODE.INTERNAL,
      message: expose ? known.message : 'Something went wrong on our side',
      details: expose ? known.details : undefined,
      requestId: req.id,
    },
  });
}
