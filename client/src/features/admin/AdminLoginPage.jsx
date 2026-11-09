import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { ROUTES } from '../../config/routes.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { useFormFields } from '../../hooks/useFormFields.js';

export function AdminLoginPage() {
  const { signInAdmin } = useAuth();
  const navigate = useNavigate();
  const { values, field } = useFormFields({ email: '', password: '' });
  const login = useAsyncAction(signInAdmin);

  const submit = async (event) => {
    event.preventDefault();
    if (await login.run(values)) navigate(ROUTES.admin.orders, { replace: true });
  };

  return (
    <>
      <h1 className="text-3xl font-extrabold">Kitchen sign-in</h1>
      <p className="mt-2 text-ink-soft">For restaurant staff only.</p>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="Email" type="email" autoComplete="username" required {...field('email')} />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          {...field('password')}
        />
        <ErrorBanner error={login.error} />
        <Button type="submit" size="lg" className="w-full" loading={login.pending}>
          Sign in
        </Button>
      </form>
    </>
  );
}
