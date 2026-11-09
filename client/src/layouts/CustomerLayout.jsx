import { Link, NavLink, Outlet } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { APP_NAME } from '../config/constants.js';
import { ROUTES } from '../config/routes.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const navClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-semibold ${isActive ? 'bg-ink text-white' : 'text-ink hover:bg-ink/5'}`;

export function CustomerLayout() {
  const { user, signOut } = useAuth();
  const { count } = useCart();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to={ROUTES.home} className="font-display text-xl font-extrabold text-tomato">
            {APP_NAME}
          </Link>
          <nav aria-label="Main" className="flex flex-wrap gap-1">
            <NavLink to={ROUTES.home} end className={navClass}>
              Menu
            </NavLink>
            <NavLink to={ROUTES.builder} className={navClass}>
              Build your own
            </NavLink>
            <NavLink to={ROUTES.orders} className={navClass}>
              My orders
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <NavLink to={ROUTES.cart} className={navClass}>
              Cart
              {count > 0 && (
                <span className="ml-1.5 rounded-full bg-tomato px-2 py-0.5 text-xs text-white">
                  {count}
                </span>
              )}
            </NavLink>
            <span className="hidden text-sm text-ink-soft sm:inline">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
