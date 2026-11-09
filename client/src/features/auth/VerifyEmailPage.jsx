import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/auth.api.js';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { ROUTES } from '../../config/routes.js';

const STATE = Object.freeze({
  WORKING: 'working',
  DONE: 'done',
  FAILED: 'failed',
  NO_TOKEN: 'no-token',
});

/** Landing page for the link in the confirmation email. The token works once. */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState(token ? STATE.WORKING : STATE.NO_TOKEN);
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    // React StrictMode runs effects twice in development; the single-use token must not.
    if (!token || started.current) return;
    started.current = true;
    authApi
      .verifyEmail(token)
      .then(() => setState(STATE.DONE))
      .catch((failure) => {
        setError(failure);
        setState(STATE.FAILED);
      });
  }, [token]);

  if (state === STATE.WORKING) return <Spinner label="Confirming your email" />;

  if (state === STATE.DONE) {
    return (
      <div role="status">
        <h1 className="text-3xl font-extrabold">Email confirmed</h1>
        <p className="mt-3 text-ink-soft">
          Your account is active. You can sign in and start ordering.
        </p>
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
    <div>
      <h1 className="text-3xl font-extrabold">This link did not work</h1>
      <p className="mt-3 text-ink-soft">
        {state === STATE.NO_TOKEN
          ? 'The confirmation link is incomplete. Open the full link from your email.'
          : 'Confirmation links work once and expire. Sign in to request a new one.'}
      </p>
      <ErrorBanner error={error} className="mt-4" />
      <Link
        to={ROUTES.login}
        className="mt-6 inline-block font-semibold text-tomato-deep underline"
      >
        Go to sign in
      </Link>
    </div>
  );
}
