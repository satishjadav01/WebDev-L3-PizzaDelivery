import { isDatabaseReady } from '../db/connection.js';

export const HEALTH_STATUS = Object.freeze({ UP: 'up', DOWN: 'down' });

/** Liveness plus the one dependency that decides whether we can serve traffic. */
export function getHealthReport({ appName }) {
  const database = isDatabaseReady() ? HEALTH_STATUS.UP : HEALTH_STATUS.DOWN;
  return {
    service: appName,
    status: database,
    uptimeSeconds: Math.round(process.uptime()),
    checks: { database },
  };
}
