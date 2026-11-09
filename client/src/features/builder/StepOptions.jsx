import { useClientConfig } from '../../context/ClientConfigContext.jsx';
import { SINGLE_CHOICE_MAX, selectedIds } from './builderState.js';

function selectionHint({ min, max }) {
  if (min === max) return `Choose ${max}`;
  return min === 0 ? `Choose up to ${max} (optional)` : `Choose ${min} to ${max}`;
}

/** Options for one builder step: radio-style for single choice, checkbox-style for multiple. */
export function StepOptions({ step, state, onToggle }) {
  const { formatMoney } = useClientConfig();
  const chosen = selectedIds(state, step);
  const single = step.max === SINGLE_CHOICE_MAX;
  const limitReached = chosen.length >= step.max;

  return (
    <fieldset className="mt-6">
      <legend className="text-xl font-bold">{step.label}</legend>
      <p className="mt-1 text-sm text-ink-soft" aria-live="polite">
        {selectionHint(step)}
        {!single && ` · ${chosen.length} of ${step.max} chosen`}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {step.options.map((option) => {
          const checked = chosen.includes(option.id);
          const blocked = !option.inStock || (!single && !checked && limitReached);
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 ${
                checked ? 'border-tomato bg-tomato/5' : 'border-line bg-paper'
              } ${blocked ? 'cursor-not-allowed opacity-50' : 'hover:border-ink/50'}`}
            >
              <span className="flex items-center gap-3">
                <input
                  type={single ? 'radio' : 'checkbox'}
                  name={step.category}
                  checked={checked}
                  disabled={blocked}
                  onChange={() => onToggle(option.id)}
                  className="h-4 w-4 accent-tomato"
                />
                <span className="font-semibold">{option.name}</span>
              </span>
              <span className="text-sm text-ink-soft">
                {option.inStock ? formatMoney(option.priceMinor) : 'Sold out'}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
