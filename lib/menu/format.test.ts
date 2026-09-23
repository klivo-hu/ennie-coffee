import { describe, expect, it } from 'vitest';
import { formatForint, formatPrice, spokenPrice } from './format';

const NBSP = ' ';

describe('formatForint', () => {
  it('groups thousands with a non-breaking space, the Hungarian way', () => {
    expect(formatForint(1890)).toBe(`1${NBSP}890${NBSP}Ft`);
    expect(formatForint(190)).toBe(`190${NBSP}Ft`);
    expect(formatForint(1_000_000)).toBe(`1${NBSP}000${NBSP}000${NBSP}Ft`);
  });

  it('refuses non-integer amounts instead of rounding money silently', () => {
    expect(() => formatForint(18.9)).toThrow(RangeError);
  });
});

describe('formatPrice', () => {
  it('marks a starting price with -tól', () => {
    expect(formatPrice({ label: null, amountHuf: 1300 }, 'from')).toBe(`1${NBSP}300${NBSP}Ft-tól`);
    expect(formatPrice({ label: null, amountHuf: 1300 }, 'exact')).toBe(`1${NBSP}300${NBSP}Ft`);
  });
});

describe('spokenPrice', () => {
  it('reads naturally for screen readers', () => {
    expect(spokenPrice({ label: '3,5 dl', amountHuf: 1550 }, 'exact')).toBe('3,5 dl: 1550 forint');
    expect(spokenPrice({ label: null, amountHuf: 1990 }, 'from')).toBe('1990 forint-tól');
  });
});
