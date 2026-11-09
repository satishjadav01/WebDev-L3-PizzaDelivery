import { DAY_MS, HOUR_MS, MINUTE_MS } from '../../config/units.js';

const UNITS = [
  { ms: DAY_MS, singular: 'day' },
  { ms: HOUR_MS, singular: 'hour' },
  { ms: MINUTE_MS, singular: 'minute' },
];

/** Human wording for emails, e.g. 86400000 -> "1 day", 7200000 -> "2 hours". */
export function describeDuration(ms) {
  const unit = UNITS.find(({ ms: size }) => ms >= size) ?? UNITS.at(-1);
  const count = Math.round(ms / unit.ms);
  return `${count} ${unit.singular}${count === 1 ? '' : 's'}`;
}
