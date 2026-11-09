import { randomUUID } from 'node:crypto';
import pinoHttp from 'pino-http';
import { HTTP_STATUS } from '../constants/index.js';

/** Attaches a request id, echoes it back, and logs one line per completed request. */
export function requestLogger({ logger, headerName }) {
  return pinoHttp({
    logger,
    genReqId: (req, res) => {
      const id = req.headers[headerName] ?? randomUUID();
      res.setHeader(headerName, id);
      return id;
    },
    customLogLevel: (_req, res, error) => {
      if (error || res.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) return 'error';
      if (res.statusCode >= HTTP_STATUS.BAD_REQUEST) return 'warn';
      return 'info';
    },
  });
}
