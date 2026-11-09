import { Router } from 'express';

export function createMetaRoutes({ controller }) {
  const router = Router();
  router.get('/client-config', controller.clientConfig);
  return router;
}
