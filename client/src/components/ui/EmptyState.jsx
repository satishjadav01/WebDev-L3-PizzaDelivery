/** An empty screen is an invitation: say what is missing and offer the next step. */
export function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-paper px-6 py-12 text-center">
      <h2 className="text-xl font-bold">{title}</h2>
      {children && <p className="mx-auto mt-2 max-w-md text-ink-soft">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
