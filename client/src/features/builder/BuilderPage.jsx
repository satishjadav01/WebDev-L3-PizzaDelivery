import { useQuery } from '@tanstack/react-query';
import { useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogApi } from '../../api/catalog.api.js';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { CUSTOM_PIZZA_LABEL, QUERY_KEY } from '../../config/constants.js';
import { ROUTES } from '../../config/routes.js';
import { useCart } from '../../context/CartContext.jsx';
import { useClientConfig } from '../../context/ClientConfigContext.jsx';
import {
  BUILDER_ACTION,
  allSelectedIds,
  builderReducer,
  initialBuilderState,
  isBuildComplete,
  isStepComplete,
  selectedOptions,
} from './builderState.js';
import { PizzaPreview } from './PizzaPreview.jsx';
import { StepOptions } from './StepOptions.jsx';

export function BuilderPage() {
  const steps = useQuery({ queryKey: QUERY_KEY.BUILDER, queryFn: catalogApi.builder });
  if (steps.isPending) return <Spinner label="Loading ingredients" />;
  if (steps.isError) return <ErrorBanner error={steps.error} onRetry={() => steps.refetch()} />;
  return <Builder steps={steps.data.steps} />;
}

function Builder({ steps }) {
  const { formatMoney, pricing } = useClientConfig();
  const { addCustomPizza, isFull } = useCart();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(builderReducer, initialBuilderState);
  const [stepIndex, setStepIndex] = useState(0);

  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const chosen = selectedOptions(state, steps);
  // A running estimate only; the quote on the summary page is the price that counts.
  const estimateMinor =
    pricing.customPizzaPreparationFeeMinor +
    chosen.reduce((sum, option) => sum + option.priceMinor, 0);

  const addToCart = () => {
    addCustomPizza({
      itemIds: allSelectedIds(state, steps),
      name: CUSTOM_PIZZA_LABEL,
      details: chosen.map((option) => option.name),
    });
    navigate(ROUTES.cart);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <section aria-labelledby="builder-heading">
        <h1 id="builder-heading" className="text-3xl font-extrabold">
          Build your own pizza
        </h1>

        <ol className="mt-5 flex flex-wrap gap-2" aria-label="Steps">
          {steps.map((entry, index) => (
            <li key={entry.category}>
              <button
                type="button"
                onClick={() => setStepIndex(index)}
                aria-current={index === stepIndex ? 'step' : undefined}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                  index === stepIndex
                    ? 'bg-ink text-white'
                    : isStepComplete(state, entry)
                      ? 'bg-basil-soft text-basil'
                      : 'bg-paper text-ink-soft border border-line'
                }`}
              >
                {index + 1}. {entry.label}
              </button>
            </li>
          ))}
        </ol>

        <StepOptions
          step={step}
          state={state}
          onToggle={(optionId) => dispatch({ type: BUILDER_ACTION.TOGGLE, step, optionId })}
        />

        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex(stepIndex - 1)}
          >
            Back
          </Button>
          {isLastStep ? (
            <Button disabled={!isBuildComplete(state, steps) || isFull} onClick={addToCart}>
              Add to cart
            </Button>
          ) : (
            <Button
              disabled={!isStepComplete(state, step)}
              onClick={() => setStepIndex(stepIndex + 1)}
            >
              Next: {steps[stepIndex + 1].label}
            </Button>
          )}
        </div>
      </section>

      <aside className="rounded-2xl border border-line bg-paper p-5" aria-label="Your pizza so far">
        <PizzaPreview options={chosen} />
        <ul className="mt-4 space-y-1 text-sm">
          {chosen.map((option) => (
            <li key={option.id} className="flex justify-between gap-3">
              <span>{option.name}</span>
              <span className="text-ink-soft">{formatMoney(option.priceMinor)}</span>
            </li>
          ))}
          {chosen.length === 0 && <li className="text-ink-soft">Choose a base to begin.</li>}
        </ul>
        <p className="mt-4 flex justify-between border-t border-line pt-3 font-semibold">
          <span>Estimated price</span>
          <span>{chosen.length ? formatMoney(estimateMinor) : '—'}</span>
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          Includes the preparation fee. The final price is confirmed on the summary page.
        </p>
      </aside>
    </div>
  );
}
