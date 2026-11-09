const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Recursively merges plain objects; arrays and primitives in `patch` replace the target's. */
export function deepMerge(target, patch) {
  const result = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    result[key] =
      isPlainObject(value) && isPlainObject(target[key]) ? deepMerge(target[key], value) : value;
  }
  return result;
}
