import { Router } from 'express';
import { createHealthController } from '../controllers/health.controller.js';

export function createHealthRoutes({ appName }) {
  const router = Router();
  const controller = createHealthController({ appName });
  router.get('/', controller.check);
  return router;
}
