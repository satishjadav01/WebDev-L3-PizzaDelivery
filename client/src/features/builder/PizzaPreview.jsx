import { INVENTORY_CATEGORY } from '../../config/constants.js';

/**
 * A top-down pizza that assembles as the customer chooses: crust, sauce, cheese, then each
 * vegetable dropping into place. Colours are derived from option names so new menu items
 * look distinct without any per-item data in the client, but each layer keeps to a hue range
 * that reads as food (tan dough, red or green sauce, yellow cheese).
 */

const VIEWBOX = 200;
const CENTER = VIEWBOX / 2;
const RADIUS = { crust: 96, sauce: 82, cheese: 74, topping: 9 };
const TOPPING_RING = { inner: 28, outer: 58 };
const GOLDEN_ANGLE_DEG = 137.5;
const HUE_FULL_TURN = 360;
const HASH_MULTIPLIER = 31;
const HASH_SEED = 7;
const LIGHTNESS_JITTER = 8;

// Each layer: allowed hue span (degrees), saturation and base lightness (percent).
const LAYER_COLOURS = {
  crust: { hue: [28, 42], saturation: 62, lightness: 64 },
  sauce: { hue: [0, 24], saturation: 72, lightness: 42 },
  cheese: { hue: [42, 52], saturation: 88, lightness: 70 },
  topping: { hue: [0, HUE_FULL_TURN], saturation: 55, lightness: 40 },
};
const PLACEHOLDER_CRUST = '#e9e4d8';

const hashOf = (name) =>
  [...name].reduce((hash, char) => (hash * HASH_MULTIPLIER + char.charCodeAt(0)) % 997, HASH_SEED);

function colourFor(name, layer) {
  const { hue, saturation, lightness } = LAYER_COLOURS[layer];
  const hash = hashOf(name);
  const [min, max] = hue;
  const chosenHue = min + (hash % (max - min + 1));
  const jitter = (hash % (2 * LIGHTNESS_JITTER + 1)) - LIGHTNESS_JITTER;
  return `hsl(${chosenHue} ${saturation}% ${lightness + jitter}%)`;
}

/** Even-looking scatter: successive toppings sit a golden angle apart on alternating rings. */
function toppingPosition(index) {
  const angle = (index * GOLDEN_ANGLE_DEG * Math.PI) / 180;
  const ring = index % 2 === 0 ? TOPPING_RING.outer : TOPPING_RING.inner;
  return { x: CENTER + ring * Math.cos(angle), y: CENTER + ring * Math.sin(angle) };
}

export function PizzaPreview({ options }) {
  const by = (category) => options.filter((option) => option.category === category);
  const [base] = by(INVENTORY_CATEGORY.BASE);
  const [sauce] = by(INVENTORY_CATEGORY.SAUCE);
  const [cheese] = by(INVENTORY_CATEGORY.CHEESE);
  const veggies = by(INVENTORY_CATEGORY.VEGGIE);

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      role="img"
      aria-label={`Your pizza: ${options.map((option) => option.name).join(', ') || 'nothing chosen yet'}`}
      className="mx-auto w-full max-w-xs drop-shadow-sm"
    >
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS.crust}
        fill={base ? colourFor(base.name, 'crust') : PLACEHOLDER_CRUST}
      />
      {sauce && (
        <circle
          key={sauce.id}
          className="topping-drop"
          cx={CENTER}
          cy={CENTER}
          r={RADIUS.sauce}
          fill={colourFor(sauce.name, 'sauce')}
        />
      )}
      {cheese && (
        <circle
          key={cheese.id}
          className="topping-drop"
          cx={CENTER}
          cy={CENTER}
          r={RADIUS.cheese}
          fill={colourFor(cheese.name, 'cheese')}
        />
      )}
      {veggies.map((veggie, index) => {
        const { x, y } = toppingPosition(index);
        return (
          <circle
            key={veggie.id}
            className="topping-drop"
            cx={x}
            cy={y}
            r={RADIUS.topping}
            fill={colourFor(veggie.name, 'topping')}
            stroke="white"
            strokeWidth="1.5"
          />
        );
      })}
    </svg>
  );
}
