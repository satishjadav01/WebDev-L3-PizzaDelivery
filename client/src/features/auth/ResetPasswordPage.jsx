import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/auth.api.js';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { ROUTES } from '../../config/routes.js';
import { useClientConfig } from '../../context/ClientConfigContext.jsx';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { useFormFields } from '../../hooks/useFormFields.js';
import { passwordProblems } from '../../utils/validation.js';
import { PasswordRules } from './PasswordRules.jsx';

export function ResetPasswordPage() {
  const { passwordPolicy } = useClientConfig();
  const [params] = useSearchParams();
  const token = params.get('token');
  const { values, field } = useFormFields({ password: '' });
  const [done, setDone] = useState(false);
  const reset = useAsyncAction(authApi.resetPassword);

  const submit = async (event) => {
    event.preventDefault();
    setDone(Boolean(await reset.run({ token, password: values.password })));
  };

  if (!token) {
    return (
      <div>
        <h1 className="text-3xl font-extrabold">This link is incomplete</h1>
        <p className="mt-3 text-ink-soft">
          Open the full link from your email, or request a new one.
        </p>
        <Link
          to={ROUTES.forgotPassword}
          className="mt-6 inline-block font-semibold text-tomato-deep underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div role="status">
        <h1 className="text-3xl font-extrabold">Password updated</h1>
        <p className="mt-3 text-ink-soft">You can now sign in with your new password.</p>
        <Link
          to={ROUTES.login}
          className="mt-6 inline-block font-semibold text-tomato-deep underline"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-extrabold">Choose a new password</h1>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <div>
          <Field
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            {...field('password')}
          />
          <PasswordRules password={values.password} policy={passwordPolicy} />
        </div>
        <ErrorBanner error={reset.error} />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={reset.pending}
          disabled={passwordProblems(values.password, passwordPolicy).length > 0}
        >
          Update password
        </Button>
      </form>
    </>
  );
}
