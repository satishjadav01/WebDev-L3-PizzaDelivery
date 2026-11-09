import { Router } from 'express';
import { validate } from '../../middleware/validate.js';

export function createAdminInventoryRoutes({ controller, schemas, idSchema }) {
  const router = Router();
  router.get('/', controller.list);
  router.patch('/:id', validate({ params: idSchema, body: schemas.update }), controller.update);
  return router;
}
