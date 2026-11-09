import { sessionBody } from '../auth.controller.js';

export function createAdminAuthController({ authService }) {
  return {
    async login(req, res) {
      res.json(sessionBody(await authService.loginAdmin(req.valid.body)));
    },
  };
}
