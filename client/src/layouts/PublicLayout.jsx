import { Link, Outlet } from 'react-router-dom';
import { APP_NAME } from '../config/constants.js';
import { ROUTES } from '../config/routes.js';

/** Frame for sign-in, sign-up and email-link pages. */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-10">
      <Link to={ROUTES.home} className="font-display text-3xl font-extrabold text-tomato">
        {APP_NAME}
      </Link>
      <main className="mt-8 w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-sm sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}
