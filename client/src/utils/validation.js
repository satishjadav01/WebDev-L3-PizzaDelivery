const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmail = (value) => EMAIL_PATTERN.test(value.trim());

/** Checks a password against the policy published by the API. Returns messages, empty if fine. */
export function passwordProblems(password, policy) {
  const problems = [];
  if (password.length < policy.minLength) {
    problems.push(`At least ${policy.minLength} characters`);
  }
  if (password.length > policy.maxLength) {
    problems.push(`At most ${policy.maxLength} characters`);
  }
  if (policy.requireDigit && !/\d/.test(password)) problems.push('At least one number');
  if (policy.requireLetter && !/[A-Za-z]/.test(password)) problems.push('At least one letter');
  return problems;
}
