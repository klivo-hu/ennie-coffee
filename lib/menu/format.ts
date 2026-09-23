import type { MenuPrice } from './types';

/**
 * Hungarian price formatting. Amounts are integer forints end to end; this module only renders
 * them. Hungarian groups thousands with a (narrow) non-breaking space — "1 890 Ft" — so a price
 * never breaks across lines.
 */

const NUMBER = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 0, useGrouping: true });
const NBSP = ' ';

export function formatForint(amountHuf: number): string {
  if (!Number.isSafeInteger(amountHuf)) throw new RangeError('Price must be an integer amount.');
  // hu-HU groups four-digit numbers too in some engines and not in others; normalize both the
  // separator and the rule so server and browser render identical text.
  const digits = NUMBER.format(amountHuf).replace(/\s/g, '');
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${grouped}${NBSP}Ft`;
}

/** "1 890 Ft-tól" for a starting price; the plain amount otherwise. */
export function formatPrice(price: MenuPrice, qualifier: 'exact' | 'from'): string {
  const amount = formatForint(price.amountHuf);
  return qualifier === 'from' ? `${amount}-tól` : amount;
}

/** Spoken form for screen readers, which read "Ft-tól" poorly. */
export function spokenPrice(price: MenuPrice, qualifier: 'exact' | 'from'): string {
  const amount = `${price.amountHuf} forint`;
  const prefix = price.label ? `${price.label}: ` : '';
  return qualifier === 'from' ? `${prefix}${amount}-tól` : `${prefix}${amount}`;
}
