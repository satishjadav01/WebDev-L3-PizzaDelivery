import { useCallback, useState } from 'react';

/** Controlled-input plumbing: `field('email')` returns the props an <input> needs. */
export function useFormFields(initialValues) {
  const [values, setValues] = useState(initialValues);

  const field = useCallback(
    (name) => ({
      name,
      value: values[name],
      onChange: (event) => setValues((current) => ({ ...current, [name]: event.target.value })),
    }),
    [values],
  );

  return { values, field };
}
