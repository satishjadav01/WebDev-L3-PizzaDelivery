import { useCallback, useState } from 'react';

/**
 * Wraps a one-off async action (submit a form, press a button) with pending and error state.
 * `run` resolves to the result, or to undefined when the action failed; the error is kept
 * in `error` for display, so callers don't need their own try/catch.
 */
export function useAsyncAction(action) {
  const [state, setState] = useState({ pending: false, error: null });

  const run = useCallback(
    async (...args) => {
      setState({ pending: true, error: null });
      try {
        const result = await action(...args);
        setState({ pending: false, error: null });
        return result ?? true;
      } catch (error) {
        setState({ pending: false, error });
        return undefined;
      }
    },
    [action],
  );

  const reset = useCallback(() => setState({ pending: false, error: null }), []);
  return { run, reset, ...state };
}
