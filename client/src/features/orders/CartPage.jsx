import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ROUTES } from '../../config/routes.js';
import { useCart } from '../../context/CartContext.jsx';
import { useClientConfig } from '../../context/ClientConfigContext.jsx';

export function CartPage() {
  const { entries, setQuantity, removeEntry } = useCart();
  const { limits } = useClientConfig();
  const navigate = useNavigate();

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        action={
          <Link to={ROUTES.home} className="font-semibold text-tomato-deep underline">
            Browse the menu
          </Link>
        }
      >
        Add a house favourite, or build a pizza from scratch.
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-extrabold">Your cart</h1>
      <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-paper">
        {entries.map((entry) => (
          <li key={entry.entryId} className="flex flex-wrap items-center gap-4 p-5">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{entry.name}</p>
              <p className="text-sm text-ink-soft">{entry.details.join(', ')}</p>
            </div>
            <div
              className="flex items-center gap-2"
              role="group"
              aria-label={`Quantity for ${entry.name}`}
            >
              <Button
                variant="secondary"
                size="sm"
                aria-label="One less"
                disabled={entry.quantity <= 1}
                onClick={() => setQuantity(entry.entryId, entry.quantity - 1)}
              >
                −
              </Button>
              <span className="w-6 text-center font-semibold" aria-live="polite">
                {entry.quantity}
              </span>
              <Button
                variant="secondary"
                size="sm"
                aria-label="One more"
                disabled={entry.quantity >= limits.maxQuantityPerLine}
                onClick={() => setQuantity(entry.entryId, entry.quantity + 1)}
              >
                +
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeEntry(entry.entryId)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Link
          to={ROUTES.home}
          className="self-center text-sm font-semibold text-tomato-deep underline"
        >
          Keep shopping
        </Link>
        <Button size="lg" onClick={() => navigate(ROUTES.summary)}>
          Review your order
        </Button>
      </div>
    </div>
  );
}
