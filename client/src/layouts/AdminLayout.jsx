import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { APP_NAME } from '../config/constants.js';
import { ROUTES } from '../config/routes.js';
import { useAuth } from '../context/AuthContext.jsx';

const navClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-semibold ${isActive ? 'bg-white text-ink' : 'text-white/80 hover:bg-white/10'}`;

export function AdminLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-display text-xl font-extrabold">{APP_NAME} · Kitchen</span>
          <nav aria-label="Admin" className="flex gap-1">
            <NavLink to={ROUTES.admin.orders} className={navClass}>
              Orders
            </NavLink>
            <NavLink to={ROUTES.admin.inventory} className={navClass}>
              Inventory
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-white/70 sm:inline">{user?.email}</span>
            <Button variant="secondary" size="sm" onClick={signOut}>
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
