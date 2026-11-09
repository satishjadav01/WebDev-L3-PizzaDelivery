import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../api/catalog.api.js';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { QUERY_KEY } from '../../config/constants.js';
import { ROUTES } from '../../config/routes.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { PizzaCard } from './PizzaCard.jsx';

export function DashboardPage() {
  const { user } = useAuth();
  const menu = useQuery({ queryKey: QUERY_KEY.MENU, queryFn: catalogApi.menu });

  return (
    <div className="space-y-10">
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold sm:text-5xl">
            Hungry, {user?.name?.split(' ')[0]}?
          </h1>
          <p className="mt-3 max-w-xl text-lg text-ink-soft">
            Pick a house favourite, or stack your own pizza from base to toppings.
          </p>
        </div>
        <Link
          to={ROUTES.builder}
          className="rounded-lg bg-basil px-6 py-3.5 font-semibold text-white hover:bg-basil/90"
        >
          Build your own pizza
        </Link>
      </section>

      <section aria-labelledby="menu-heading">
        <h2 id="menu-heading" className="mb-5 text-2xl font-bold">
          House favourites
        </h2>
        {menu.isPending && <Spinner label="Loading the menu" />}
        <ErrorBanner error={menu.error} onRetry={() => menu.refetch()} />
        {menu.data?.pizzas.length === 0 && (
          <EmptyState title="The menu is empty">
            Check back soon, or build your own pizza.
          </EmptyState>
        )}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {menu.data?.pizzas.map((pizza) => (
            <PizzaCard key={pizza.id} pizza={pizza} />
          ))}
        </div>
      </section>
    </div>
  );
}
