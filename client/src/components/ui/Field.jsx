import { useId } from 'react';

/** Labelled input with an inline error and optional hint, wired up for screen readers. */
export function Field({
  label,
  error,
  hint,
  as: Tag = 'input',
  className = '',
  children,
  ...rest
}) {
  const id = useId();
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ');
  const control = (
    <Tag
      id={id}
      aria-invalid={Boolean(error)}
      aria-describedby={describedBy || undefined}
      className={`w-full rounded-lg border bg-paper px-3.5 py-2.5 text-ink placeholder:text-ink/40 ${
        error ? 'border-tomato' : 'border-line hover:border-ink/50'
      }`}
      {...rest}
    >
      {children}
    </Tag>
  );
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {control}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-tomato-deep">
          {error}
        </p>
      )}
    </div>
  );
}
