import { ERROR_CODE, ROLE, TOKEN_TYPE } from '../constants/index.js';
import { generateToken } from '../utils/crypto.js';
import {
  ConflictError,
  ForbiddenError,
  InvalidTokenError,
  NotFoundError,
  UnauthenticatedError,
} from '../utils/errors/index.js';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

export function createAuthService({
  userRepository,
  tokenRepository,
  tokenService,
  passwordService,
  notificationService,
  authConfig,
  clock,
  logger,
}) {
  const { oneTimeTokens } = authConfig;

  // Compared against when the email is unknown, so response time does not reveal accounts.
  let decoyHash;
  const getDecoyHash = () => {
    decoyHash ??= passwordService.hash(generateToken(oneTimeTokens.byteLength));
    return decoyHash;
  };

  const isCoolingDown = async (user, type) => {
    const latest = await tokenRepository.findLatest({ user: user._id, type });
    if (!latest) return false;
    return clock.now().getTime() - latest.createdAt.getTime() < oneTimeTokens.resendCooldownMs;
  };

  // Mail trouble must not undo a sign-up or reveal whether an account exists.
  const sendQuietly = async (send, context) => {
    try {
      await send();
      return true;
    } catch (error) {
      logger.warn({ err: error, ...context }, 'notification email failed');
      return false;
    }
  };

  const issueVerification = async (user) => {
    await tokenRepository.deleteAllFor({ user: user._id, type: TOKEN_TYPE.EMAIL_VERIFICATION });
    const rawToken = await tokenService.issueOneTimeToken({
      userId: user._id,
      type: TOKEN_TYPE.EMAIL_VERIFICATION,
      ttlMs: oneTimeTokens.verifyEmailTtlMs,
    });
    const sent = await sendQuietly(
      () => notificationService.sendVerificationEmail({ user, rawToken }),
      { userId: user._id },
    );
    // A link that never left must not start the resend cooldown, or "resend" would do nothing.
    if (!sent) {
      await tokenRepository.deleteAllFor({ user: user._id, type: TOKEN_TYPE.EMAIL_VERIFICATION });
    }
    return sent;
  };

  const authenticate = async ({ email, password, role }) => {
    const user = await userRepository.findByEmailWithPassword(email);
    const matches = await passwordService.compare(
      password,
      user ? user.passwordHash : await getDecoyHash(),
    );
    if (!user || !matches || user.role !== role) {
      throw new UnauthenticatedError(INVALID_CREDENTIALS_MESSAGE);
    }
    return user;
  };

  const openSession = (user) => {
    const { token, expiresInMs } = tokenService.issueAccessToken({
      userId: user._id,
      role: user.role,
    });
    return { accessToken: token, expiresInMs, user };
  };

  return {
    async register({ name, email, password }) {
      if (await userRepository.findByEmail(email)) {
        throw new ConflictError('An account with this email already exists');
      }
      const user = await userRepository.create({
        name,
        email,
        passwordHash: await passwordService.hash(password),
        role: ROLE.CUSTOMER,
      });
      const verificationEmailSent = await issueVerification(user);
      return { user, verificationEmailSent };
    },

    async verifyEmail({ token }) {
      const userId = await tokenService.consumeOneTimeToken({
        raw: token,
        type: TOKEN_TYPE.EMAIL_VERIFICATION,
      });
      if (!userId) throw new InvalidTokenError();
      return userRepository.markEmailVerified(userId);
    },

    async resendVerification({ email }) {
      const user = await userRepository.findByEmail(email);
      if (!user || user.isEmailVerified) return;
      if (await isCoolingDown(user, TOKEN_TYPE.EMAIL_VERIFICATION)) return;
      await issueVerification(user);
    },

    async login({ email, password }) {
      const user = await authenticate({ email, password, role: ROLE.CUSTOMER });
      if (!user.isEmailVerified) {
        throw new ForbiddenError(
          'Please confirm your email address before signing in',
          ERROR_CODE.EMAIL_NOT_VERIFIED,
        );
      }
      return openSession(user);
    },

    async loginAdmin({ email, password }) {
      return openSession(await authenticate({ email, password, role: ROLE.ADMIN }));
    },

    async forgotPassword({ email }) {
      const user = await userRepository.findByEmail(email);
      if (!user || (await isCoolingDown(user, TOKEN_TYPE.PASSWORD_RESET))) return;

      await tokenRepository.deleteAllFor({ user: user._id, type: TOKEN_TYPE.PASSWORD_RESET });
      const rawToken = await tokenService.issueOneTimeToken({
        userId: user._id,
        type: TOKEN_TYPE.PASSWORD_RESET,
        ttlMs: oneTimeTokens.resetPasswordTtlMs,
      });
      const sent = await sendQuietly(
        () => notificationService.sendPasswordResetEmail({ user, rawToken }),
        { userId: user._id },
      );
      if (!sent) {
        await tokenRepository.deleteAllFor({ user: user._id, type: TOKEN_TYPE.PASSWORD_RESET });
      }
    },

    async resetPassword({ token, password }) {
      const userId = await tokenService.consumeOneTimeToken({
        raw: token,
        type: TOKEN_TYPE.PASSWORD_RESET,
      });
      if (!userId) throw new InvalidTokenError();

      await userRepository.updatePasswordHash(userId, await passwordService.hash(password));
      // Receiving the reset email also proves the address belongs to this user.
      await userRepository.markEmailVerified(userId);
      await tokenRepository.deleteAllFor({ user: userId, type: TOKEN_TYPE.PASSWORD_RESET });
    },

    async getProfile(userId) {
      const user = await userRepository.findById(userId);
      if (!user) throw new NotFoundError('Account not found');
      return user;
    },

    /** Idempotent: creates the admin once, never touches an existing admin's password. */
    async provisionAdmin({ email, password }) {
      const existing = await userRepository.findByEmail(email);
      if (existing) {
        if (existing.role !== ROLE.ADMIN) {
          throw new ConflictError('That email already belongs to a customer account');
        }
        return { created: false, user: existing };
      }
      const user = await userRepository.create({
        name: authConfig.admin.defaultName,
        email,
        passwordHash: await passwordService.hash(password),
        role: ROLE.ADMIN,
        isEmailVerified: true,
      });
      return { created: true, user };
    },
  };
}
