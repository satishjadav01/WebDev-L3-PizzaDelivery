import { Button } from './Button.jsx';

/** Says what went wrong in the API's own words and, when possible, offers a retry. */
export function ErrorBanner({ error, onRetry, className = '' }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className={`rounded-lg border border-tomato/40 bg-tomato/5 p-4 text-sm text-tomato-deep ${className}`}
    >
      <p className="font-semibold">{error.message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
