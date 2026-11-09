import { HTTP_STATUS } from '../constants/index.js';
import { getHealthReport, HEALTH_STATUS } from '../services/health.service.js';

export function createHealthController({ appName }) {
  return {
    check(_req, res) {
      const report = getHealthReport({ appName });
      const statusCode =
        report.status === HEALTH_STATUS.UP ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
      res.status(statusCode).json(report);
    },
  };
}
