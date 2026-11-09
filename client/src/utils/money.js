const DISPLAY_LOCALE = 'en-IN';

/** Builds a formatter for integer minor-unit amounts, using the currency the API reports. */
export function createMoneyFormatter({ code, minorUnitFactor }) {
  const formatter = new Intl.NumberFormat(DISPLAY_LOCALE, { style: 'currency', currency: code });
  return (amountMinor) => formatter.format(amountMinor / minorUnitFactor);
}
