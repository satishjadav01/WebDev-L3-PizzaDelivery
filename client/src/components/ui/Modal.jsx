import { useEffect, useRef } from 'react';

/**
 * Native <dialog>: focus trapping, Escape-to-close and the backdrop come from the browser.
 * With `dismissible={false}` Escape is ignored, for steps that must finish or be cancelled
 * explicitly (an open payment).
 */
export function Modal({ open, title, onClose, dismissible = true, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClose={onClose}
      onCancel={(event) => !dismissible && event.preventDefault()}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-paper p-0 text-ink shadow-xl backdrop:bg-ink/50"
    >
      {open && (
        <div className="p-6">
          <h2 id="modal-title" className="text-2xl font-bold">
            {title}
          </h2>
          <div className="mt-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
