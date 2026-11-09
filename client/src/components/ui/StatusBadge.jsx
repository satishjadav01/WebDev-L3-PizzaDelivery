import { ORDER_STATUS } from '../../config/constants.js';

const TONES = {
  [ORDER_STATUS.AWAITING_PAYMENT]: 'bg-cheese/25 text-ink',
  [ORDER_STATUS.PAYMENT_FAILED]: 'bg-tomato/10 text-tomato-deep',
  [ORDER_STATUS.ORDER_RECEIVED]: 'bg-ink/10 text-ink',
  [ORDER_STATUS.IN_KITCHEN]: 'bg-tomato/15 text-tomato-deep',
  [ORDER_STATUS.SENT_TO_DELIVERY]: 'bg-basil-soft text-basil',
};

export function StatusBadge({ status, label }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${TONES[status] ?? 'bg-ink/10'}`}
    >
      {label}
    </span>
  );
}
