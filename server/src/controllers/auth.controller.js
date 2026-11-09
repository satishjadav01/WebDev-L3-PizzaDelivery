import { HTTP_STATUS } from '../constants/index.js';
import { toUserDto } from '../presenters/user.presenter.js';

const sessionBody = ({ accessToken, expiresInMs, user }) => ({
  accessToken,
  tokenType: 'Bearer',
  expiresInMs,
  user: toUserDto(user),
});

export function createAuthController({ authService }) {
  return {
    async register(req, res) {
      const { user, verificationEmailSent } = await authService.register(req.valid.body);
      res.status(HTTP_STATUS.CREATED).json({ user: toUserDto(user), verificationEmailSent });
    },

    async verifyEmail(req, res) {
      const user = await authService.verifyEmail(req.valid.body);
      res.json({ user: toUserDto(user) });
    },

    async resendVerification(req, res) {
      await authService.resendVerification(req.valid.body);
      res.status(HTTP_STATUS.ACCEPTED).json({ accepted: true });
    },

    async login(req, res) {
      res.json(sessionBody(await authService.login(req.valid.body)));
    },

    async forgotPassword(req, res) {
      await authService.forgotPassword(req.valid.body);
      res.status(HTTP_STATUS.ACCEPTED).json({ accepted: true });
    },

    async resetPassword(req, res) {
      await authService.resetPassword(req.valid.body);
      res.status(HTTP_STATUS.NO_CONTENT).end();
    },

    async me(req, res) {
      res.json({ user: toUserDto(await authService.getProfile(req.auth.userId)) });
    },
  };
}

export { sessionBody };
