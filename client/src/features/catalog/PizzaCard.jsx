import { Button } from '../../components/ui/Button.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useClientConfig } from '../../context/ClientConfigContext.jsx';

export function PizzaCard({ pizza }) {
  const { formatMoney } = useClientConfig();
  const { addMenuPizza, isFull } = useCart();

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-paper p-5">
      <h3 className="text-xl font-bold">{pizza.name}</h3>
      <p className="mt-1 text-ink-soft">{pizza.description}</p>
      <p className="mt-3 text-sm text-ink-soft">
        {pizza.ingredients.map((ingredient) => ingredient.name).join(', ')}
      </p>
      <div className="mt-auto flex items-center justify-between pt-5">
        <span className="font-display text-xl font-bold">{formatMoney(pizza.priceMinor)}</span>
        {pizza.inStock ? (
          <Button size="sm" disabled={isFull} onClick={() => addMenuPizza(pizza)}>
            Add to cart
          </Button>
        ) : (
          <span className="text-sm font-semibold text-tomato-deep">Sold out for now</span>
        )}
      </div>
    </article>
  );
}
