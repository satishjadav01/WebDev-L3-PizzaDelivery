import { z } from 'zod';

/**
 * Request schemas for the auth endpoints, built from config so the rules shown to users,
 * enforced by the API and documented in docs/ cannot drift apart.
 */
export function buildAuthSchemas(authConfig) {
  const { password: policy, profile, oneTimeTokens } = authConfig;

  const email = z
    .string()
    .trim()
    .toLowerCase()
    .max(profile.emailMaxLength)
    .pipe(z.email('Enter a valid email address'));

  let newPassword = z
    .string()
    .min(policy.minLength, `Password must be at least ${policy.minLength} characters`)
    .max(policy.maxLength, `Password must be at most ${policy.maxLength} characters`);
  if (policy.requireDigit) {
    newPassword = newPassword.regex(/\d/, 'Password must contain at least one number');
  }
  if (policy.requireLetter) {
    newPassword = newPassword.regex(/[A-Za-z]/, 'Password must contain at least one letter');
  }

  const token = z.string().trim().min(1).max(oneTimeTokens.maxLength);

  return {
    register: z.strictObject({
      name: z.string().trim().min(1).max(profile.nameMaxLength),
      email,
      password: newPassword,
    }),
    login: z.strictObject({
      email,
      // No policy on login: old or odd passwords must still reach the hash comparison.
      password: z.string().min(1).max(policy.maxLength),
    }),
    verifyEmail: z.strictObject({ token }),
    resendVerification: z.strictObject({ email }),
    forgotPassword: z.strictObject({ email }),
    resetPassword: z.strictObject({ token, password: newPassword }),
  };
}
