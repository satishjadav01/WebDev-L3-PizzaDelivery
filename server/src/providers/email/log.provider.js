import { randomUUID } from 'node:crypto';

const URL_PATTERN = /https?:\/\/\S+/g;

/**
 * Development stand-in for email: nothing leaves the machine. Each message is printed to the
 * server log with its links listed separately, so a verification or reset link can be opened
 * straight from the terminal. Works on any network, including ones that block Ethereal.
 */
export function createLogEmailProvider({ logger }) {
  return {
    async sendMail({ to, subject, text }) {
      const links = text?.match(URL_PATTERN) ?? [];
      logger.info({ to, subject, links }, 'email NOT sent (log provider): open the link below');
      return { messageId: `log-${randomUUID()}` };
    },
  };
}
