import {
  renderLowStockAlert,
  renderResetPassword,
  renderVerifyEmail,
} from '../templates/email/index.js';

/** Turns domain events into emails. Knows templates and links; delivery is the provider's job. */
export function createNotificationService({ emailProvider, env, mailConfig, authConfig }) {
  const baseUrl = (env.CLIENT_BASE_URL ?? env.CLIENT_ORIGIN[0]).replace(/\/+$/, '');
  const linkTo = (path, query) => {
    const url = new URL(`${baseUrl}${path}`);
    if (query) url.search = new URLSearchParams(query).toString();
    return url.toString();
  };

  return {
    sendVerificationEmail({ user, rawToken }) {
      const message = renderVerifyEmail({
        name: user.name,
        link: linkTo(mailConfig.links.verifyEmail, { token: rawToken }),
        ttlMs: authConfig.oneTimeTokens.verifyEmailTtlMs,
      });
      return emailProvider.sendMail({ to: user.email, ...message });
    },

    sendPasswordResetEmail({ user, rawToken }) {
      const message = renderResetPassword({
        name: user.name,
        link: linkTo(mailConfig.links.resetPassword, { token: rawToken }),
        ttlMs: authConfig.oneTimeTokens.resetPasswordTtlMs,
      });
      return emailProvider.sendMail({ to: user.email, ...message });
    },

    sendLowStockAlert({ recipient, items }) {
      const message = renderLowStockAlert({
        items,
        link: linkTo(mailConfig.links.adminInventory),
      });
      return emailProvider.sendMail({ to: recipient, ...message });
    },
  };
}
