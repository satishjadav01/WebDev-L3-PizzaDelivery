import { Spinner } from './Spinner.jsx';

const VARIANTS = {
  primary: 'bg-tomato text-white hover:bg-tomato-deep disabled:bg-tomato/50',
  secondary: 'bg-paper text-ink border border-line hover:border-ink disabled:text-ink/40',
  ghost: 'bg-transparent text-ink hover:bg-ink/5 disabled:text-ink/40',
  danger: 'bg-paper text-tomato-deep border border-tomato/40 hover:bg-tomato/5 disabled:opacity-50',
};

const SIZES = {
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3.5 text-base',
  sm: 'px-3 py-1.5 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  children,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading && <Spinner size="sm" label="" />}
      {children}
    </button>
  );
}
