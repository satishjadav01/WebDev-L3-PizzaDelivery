const SIZES = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-[3px]' };

export function Spinner({ size = 'md', label = 'Loading', fullPage = false }) {
  const ring = (
    <span
      className={`inline-block animate-spin rounded-full border-ink/20 border-t-tomato ${SIZES[size]}`}
      aria-hidden="true"
    />
  );
  if (!label) return ring;
  return (
    <div
      role="status"
      className={`flex items-center justify-center gap-3 text-ink-soft ${fullPage ? 'min-h-screen' : 'py-10'}`}
    >
      {ring}
      <span>{label}…</span>
    </div>
  );
}
