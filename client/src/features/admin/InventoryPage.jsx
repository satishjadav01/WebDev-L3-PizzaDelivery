import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi } from '../../api/admin.api.js';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { QUERY_KEY } from '../../config/constants.js';

const CATEGORY_ORDER_LABELS = {
  base: 'Pizza bases',
  sauce: 'Sauces',
  cheese: 'Cheeses',
  veggie: 'Vegetables',
};

export function InventoryPage() {
  const inventory = useQuery({ queryKey: QUERY_KEY.ADMIN_INVENTORY, queryFn: adminApi.inventory });

  if (inventory.isPending) return <Spinner label="Loading stock levels" />;
  if (inventory.isError)
    return <ErrorBanner error={inventory.error} onRetry={() => inventory.refetch()} />;

  const groups = Object.entries(CATEGORY_ORDER_LABELS).map(([category, label]) => ({
    category,
    label,
    items: inventory.data.items.filter((item) => item.category === category),
  }));
  const lowCount = inventory.data.items.filter((item) => item.isLow).length;

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Inventory</h1>
      <p className="mt-2 text-ink-soft" role="status">
        {lowCount === 0
          ? 'Everything is above its alert threshold.'
          : `${lowCount} item${lowCount === 1 ? ' is' : 's are'} below the alert threshold. Admins are emailed when stock runs low.`}
      </p>
      {groups.map((group) => (
        <section key={group.category} className="mt-8" aria-labelledby={`inv-${group.category}`}>
          <h2 id={`inv-${group.category}`} className="text-xl font-bold">
            {group.label}
          </h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-paper">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 font-semibold">In stock</th>
                  <th className="px-4 py-3 font-semibold">Alert below</th>
                  <th className="px-4 py-3 font-semibold">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {group.items.map((item) => (
                  <InventoryRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function InventoryRow({ item }) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [threshold, setThreshold] = useState(String(item.threshold));

  const save = useMutation({
    mutationFn: (changes) => adminApi.updateInventory(item.id, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY.ADMIN_INVENTORY }),
  });

  const changes = {};
  if (quantity !== '' && Number(quantity) !== item.quantity) changes.quantity = Number(quantity);
  if (threshold !== '' && Number(threshold) !== item.threshold)
    changes.threshold = Number(threshold);
  const hasChanges = Object.keys(changes).length > 0;

  return (
    <tr className={item.isLow ? 'bg-tomato/5' : undefined}>
      <td className="px-4 py-3 font-semibold">
        {item.name}
        {item.isLow && (
          <span className="ml-2 rounded-full bg-tomato px-2 py-0.5 text-xs text-white">Low</span>
        )}
      </td>
      <td className="px-4 py-3">{item.quantity}</td>
      <td className="px-4 py-3">{item.threshold}</td>
      <td className="px-4 py-3">
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate(changes);
          }}
        >
          <label className="sr-only" htmlFor={`qty-${item.id}`}>
            {item.name} quantity
          </label>
          <input
            id={`qty-${item.id}`}
            type="number"
            min="0"
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="w-24 rounded-lg border border-line px-2 py-1.5"
          />
          <label className="sr-only" htmlFor={`thr-${item.id}`}>
            {item.name} alert threshold
          </label>
          <input
            id={`thr-${item.id}`}
            type="number"
            min="0"
            inputMode="numeric"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            className="w-24 rounded-lg border border-line px-2 py-1.5"
          />
          <Button type="submit" size="sm" loading={save.isPending} disabled={!hasChanges}>
            Save
          </Button>
        </form>
        <ErrorBanner error={save.error} className="mt-2" />
      </td>
    </tr>
  );
}
