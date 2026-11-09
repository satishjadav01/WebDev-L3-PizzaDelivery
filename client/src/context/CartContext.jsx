/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ORDER_LINE_KIND, STORAGE_KEY } from '../config/constants.js';
import { safeStorage } from '../storage/safeStorage.js';
import { useClientConfig } from './ClientConfigContext.jsx';

const CartContext = createContext(null);

const newEntryId = () => crypto.randomUUID();

/**
 * Cart entries keep display details (name, ingredient names) next to the ids the API needs.
 * Prices are intentionally NOT stored: the quote endpoint is the only source of money.
 */
export function CartProvider({ children }) {
  const { limits } = useClientConfig();
  const [entries, setEntries] = useState(() => safeStorage.read(STORAGE_KEY.CART) ?? []);

  useEffect(() => {
    safeStorage.write(STORAGE_KEY.CART, entries);
  }, [entries]);

  const clampQuantity = useCallback(
    (quantity) => Math.min(Math.max(quantity, 1), limits.maxQuantityPerLine),
    [limits.maxQuantityPerLine],
  );

  const addMenuPizza = useCallback(
    (pizza) =>
      setEntries((current) => {
        const existing = current.find((entry) => entry.pizzaId === pizza.id);
        if (existing) {
          return current.map((entry) =>
            entry === existing ? { ...entry, quantity: clampQuantity(entry.quantity + 1) } : entry,
          );
        }
        if (current.length >= limits.maxLinesPerOrder) return current;
        return [
          ...current,
          {
            entryId: newEntryId(),
            kind: ORDER_LINE_KIND.MENU,
            pizzaId: pizza.id,
            name: pizza.name,
            details: pizza.ingredients.map((ingredient) => ingredient.name),
            quantity: 1,
          },
        ];
      }),
    [clampQuantity, limits.maxLinesPerOrder],
  );

  const addCustomPizza = useCallback(
    ({ itemIds, name, details }) =>
      setEntries((current) =>
        current.length >= limits.maxLinesPerOrder
          ? current
          : [
              ...current,
              {
                entryId: newEntryId(),
                kind: ORDER_LINE_KIND.CUSTOM,
                itemIds,
                name,
                details,
                quantity: 1,
              },
            ],
      ),
    [limits.maxLinesPerOrder],
  );

  const setQuantity = useCallback(
    (entryId, quantity) =>
      setEntries((current) =>
        current.map((entry) =>
          entry.entryId === entryId ? { ...entry, quantity: clampQuantity(quantity) } : entry,
        ),
      ),
    [clampQuantity],
  );

  const removeEntry = useCallback(
    (entryId) => setEntries((current) => current.filter((entry) => entry.entryId !== entryId)),
    [],
  );
  const clear = useCallback(() => setEntries([]), []);

  const value = useMemo(
    () => ({
      entries,
      count: entries.reduce((sum, entry) => sum + entry.quantity, 0),
      isFull: entries.length >= limits.maxLinesPerOrder,
      /** The cart in the shape the orders API expects. */
      toOrderLines: () =>
        entries.map((entry) =>
          entry.kind === ORDER_LINE_KIND.MENU
            ? { kind: entry.kind, pizzaId: entry.pizzaId, quantity: entry.quantity }
            : { kind: entry.kind, itemIds: entry.itemIds, quantity: entry.quantity },
        ),
      addMenuPizza,
      addCustomPizza,
      setQuantity,
      removeEntry,
      clear,
    }),
    [
      entries,
      limits.maxLinesPerOrder,
      addMenuPizza,
      addCustomPizza,
      setQuantity,
      removeEntry,
      clear,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside CartProvider');
  return value;
}
