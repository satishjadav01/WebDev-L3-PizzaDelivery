import { Router } from 'express';
import { validate } from '../../middleware/validate.js';

export function createAdminAuthRoutes({ controller, schemas, authLimiter }) {
  const router = Router();
  router.post('/login', authLimiter, validate({ body: schemas.login }), controller.login);
  return router;
}
