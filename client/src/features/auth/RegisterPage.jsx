import { useState } from 'react';
import { Link } from 'react-router-dom';
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

export function RegisterPage() {
  const { passwordPolicy } = useClientConfig();
  const { values, field } = useFormFields({ name: '', email: '', password: '' });
  const [registered, setRegistered] = useState(null);
  const register = useAsyncAction(authApi.register);
  const resend = useAsyncAction(authApi.resendVerification);
  const [resent, setResent] = useState(false);

  const fieldErrors = register.error?.fieldErrors?.() ?? {};
  const passwordReady = passwordProblems(values.password, passwordPolicy).length === 0;

  const submit = async (event) => {
    event.preventDefault();
    const result = await register.run(values);
    if (result) setRegistered(result);
  };

  if (registered) {
    return (
      <div role="status">
        <h1 className="text-3xl font-extrabold">Check your inbox</h1>
        <p className="mt-3 text-ink-soft">
          {registered.verificationEmailSent
            ? `We sent a confirmation link to ${values.email}. Open it to activate your account.`
            : 'Your account is created, but the confirmation email could not be sent. Request a new one below.'}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            loading={resend.pending}
            disabled={resent}
            onClick={async () => setResent(Boolean(await resend.run(values.email)))}
          >
            {resent ? 'Email requested' : 'Resend confirmation email'}
          </Button>
          <Link to={ROUTES.login} className="font-semibold text-tomato-deep underline">
            Go to sign in
          </Link>
        </div>
        <ErrorBanner error={resend.error} className="mt-4" />
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-extrabold">Create your account</h1>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field
          label="Full name"
          autoComplete="name"
          required
          error={fieldErrors.name}
          {...field('name')}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          error={fieldErrors.email}
          {...field('email')}
        />
        <div>
          <Field
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            error={fieldErrors.password}
            {...field('password')}
          />
          <PasswordRules password={values.password} policy={passwordPolicy} />
        </div>
        <ErrorBanner error={register.error} />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={register.pending}
          disabled={!values.name.trim() || !values.email.trim() || !passwordReady}
        >
          Create account
        </Button>
      </form>
      <p className="mt-6 text-sm">
        Already registered?{' '}
        <Link to={ROUTES.login} className="font-semibold text-tomato-deep underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
