/**
 * Fails fast when a provider is missing a method its contract promises, so a bad
 * adapter breaks at startup instead of on the first live request.
 */
export function assertImplements(candidate, methodNames, label) {
  const missing = methodNames.filter((name) => typeof candidate?.[name] !== 'function');
  if (missing.length > 0) {
    throw new TypeError(`${label} is missing required method(s): ${missing.join(', ')}`);
  }
  return candidate;
}
