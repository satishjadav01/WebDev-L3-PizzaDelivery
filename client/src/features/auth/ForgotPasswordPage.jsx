import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/auth.api.js';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { ROUTES } from '../../config/routes.js';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { useFormFields } from '../../hooks/useFormFields.js';
import { isEmail } from '../../utils/validation.js';

export function ForgotPasswordPage() {
  const { values, field } = useFormFields({ email: '' });
  const [sent, setSent] = useState(false);
  const request = useAsyncAction(authApi.forgotPassword);

  const submit = async (event) => {
    event.preventDefault();
    setSent(Boolean(await request.run(values.email)));
  };

  if (sent) {
    return (
      <div role="status">
        <h1 className="text-3xl font-extrabold">Check your inbox</h1>
        <p className="mt-3 text-ink-soft">
          If {values.email} has an account, we have sent a link to choose a new password. It works
          once and expires soon.
        </p>
        <Link
          to={ROUTES.login}
          className="mt-6 inline-block font-semibold text-tomato-deep underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-extrabold">Reset your password</h1>
      <p className="mt-2 text-ink-soft">Enter your email and we will send you a reset link.</p>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="Email" type="email" autoComplete="email" required {...field('email')} />
        <ErrorBanner error={request.error} />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={request.pending}
          disabled={!isEmail(values.email)}
        >
          Send reset link
        </Button>
      </form>
      <Link
        to={ROUTES.login}
        className="mt-6 inline-block text-sm font-semibold text-tomato-deep underline"
      >
        Back to sign in
      </Link>
    </>
  );
}
