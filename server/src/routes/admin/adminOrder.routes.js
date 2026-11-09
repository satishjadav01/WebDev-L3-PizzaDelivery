import { Router } from 'express';
import { validate } from '../../middleware/validate.js';

export function createAdminOrderRoutes({ controller, schemas }) {
  const router = Router();
  router.get('/', validate({ query: schemas.adminOrderList }), controller.list);
  router.patch(
    '/:id/status',
    validate({ params: schemas.idParam, body: schemas.changeStatus }),
    controller.changeStatus,
  );
  return router;
}
