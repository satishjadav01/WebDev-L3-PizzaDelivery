/** Progress through the kitchen, using the labels and steps the API reports. */
export function OrderTracker({ steps }) {
  return (
    <ol className="flex flex-col gap-4 sm:flex-row sm:gap-0" aria-label="Order progress">
      {steps.map((step, index) => (
        <li key={step.status} className="flex flex-1 items-center gap-3 sm:flex-col sm:items-start">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              step.reached ? 'bg-basil text-white' : 'border border-line bg-paper text-ink-soft'
            }`}
            aria-hidden="true"
          >
            {step.reached ? '✓' : index + 1}
          </span>
          <span className={step.reached ? 'font-semibold' : 'text-ink-soft'}>
            {step.label}
            <span className="sr-only">{step.reached ? ' (done)' : ' (not yet)'}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
