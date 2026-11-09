import { passwordProblems } from '../../utils/validation.js';

/** Live checklist of the server's password policy, so users see what is still missing. */
export function PasswordRules({ password, policy }) {
  const missing = new Set(passwordProblems(password, policy));
  const rules = [
    `At least ${policy.minLength} characters`,
    ...(policy.requireDigit ? ['At least one number'] : []),
    ...(policy.requireLetter ? ['At least one letter'] : []),
  ];

  return (
    <ul className="mt-2 space-y-1 text-sm" aria-label="Password requirements">
      {rules.map((rule) => {
        const met = password.length > 0 && !missing.has(rule);
        return (
          <li key={rule} className={met ? 'text-basil' : 'text-ink-soft'}>
            <span aria-hidden="true">{met ? '✓ ' : '○ '}</span>
            {rule}
            <span className="sr-only">{met ? ' (met)' : ' (not met yet)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
