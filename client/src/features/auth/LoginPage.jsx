import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api.js';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { ERROR_CODE } from '../../config/constants.js';
import { ROUTES } from '../../config/routes.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { useFormFields } from '../../hooks/useFormFields.js';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { values, field } = useFormFields({ email: '', password: '' });
  const [confirmationResent, setConfirmationResent] = useState(false);
  const login = useAsyncAction(signIn);
  const resend = useAsyncAction(authApi.resendVerification);

  const submit = async (event) => {
    event.preventDefault();
    setConfirmationResent(false);
    if (await login.run(values)) {
      navigate(location.state?.from?.pathname ?? ROUTES.home, { replace: true });
    }
  };

  const resendConfirmation = async () =>
    setConfirmationResent(Boolean(await resend.run(values.email)));
  const needsVerification = login.error?.code === ERROR_CODE.EMAIL_NOT_VERIFIED;

  return (
    <>
      <h1 className="text-3xl font-extrabold">Welcome back</h1>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="Email" type="email" autoComplete="email" required {...field('email')} />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          {...field('password')}
        />
        <ErrorBanner error={login.error} />
        {needsVerification &&
          (confirmationResent ? (
            <p role="status" className="text-sm font-medium text-basil">
              If that address has an unconfirmed account, a new email is on its way.
            </p>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              loading={resend.pending}
              onClick={resendConfirmation}
            >
              Send a new confirmation email
            </Button>
          ))}
        <Button type="submit" size="lg" className="w-full" loading={login.pending}>
          Sign in
        </Button>
      </form>
      <div className="mt-6 flex justify-between text-sm">
        <Link to={ROUTES.forgotPassword} className="font-semibold text-tomato-deep underline">
          Forgot your password?
        </Link>
        <Link to={ROUTES.register} className="font-semibold text-tomato-deep underline">
          Create an account
        </Link>
      </div>
    </>
  );
}
