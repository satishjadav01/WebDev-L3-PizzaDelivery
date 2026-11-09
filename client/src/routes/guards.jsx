import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '../components/ui/Spinner.jsx';
import { ROUTES } from '../config/routes.js';
import { AUTH_STATUS, useAuth } from '../context/AuthContext.jsx';

/** Waits for session restore, then sends the visitor to `redirectTo` unless `allow` passes. */
function Gate({ allow, redirectTo, rememberLocation = false }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === AUTH_STATUS.LOADING)
    return <Spinner label="Checking your session" fullPage />;
  if (allow(auth)) return <Outlet />;
  return (
    <Navigate to={redirectTo(auth)} replace state={rememberLocation ? { from: location } : null} />
  );
}

export function RequireCustomer() {
  return (
    <Gate
      allow={(auth) => auth.isCustomer}
      redirectTo={(auth) => (auth.isAdmin ? ROUTES.admin.orders : ROUTES.login)}
      rememberLocation
    />
  );
}

export function RequireAdmin() {
  return (
    <Gate
      allow={(auth) => auth.isAdmin}
      redirectTo={(auth) => (auth.isCustomer ? ROUTES.home : ROUTES.admin.login)}
    />
  );
}

/** Sign-in and sign-up pages: a signed-in visitor goes to their own home instead. */
export function GuestOnly() {
  return (
    <Gate
      allow={(auth) => auth.status === AUTH_STATUS.ANONYMOUS}
      redirectTo={(auth) => (auth.isAdmin ? ROUTES.admin.orders : ROUTES.home)}
    />
  );
}
