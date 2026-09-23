import { describe, expect, it } from 'vitest';
import {
  hoursRows,
  hungarianDayRange,
  parseOpeningHours,
  schemaOpeningHours,
} from './opening-hours';

describe('parseOpeningHours', () => {
  it('parses the published hours', () => {
    expect(parseOpeningHours('Mo-Fr 09:30-19:00; Sa-Su 10:00-19:00')).toEqual([
      { days: ['Mo', 'Tu', 'We', 'Th', 'Fr'], opens: '09:30', closes: '19:00' },
      { days: ['Sa', 'Su'], opens: '10:00', closes: '19:00' },
    ]);
  });

  it('drops malformed segments instead of inventing hours', () => {
    expect(parseOpeningHours('Mo-Fr 9:30-19:00; Xx 10:00-12:00; Sa 25:00-26:00')).toEqual([]);
    expect(parseOpeningHours(undefined)).toEqual([]);
  });

  it('accepts comma-separated days', () => {
    expect(parseOpeningHours('Mo,We 08:00-12:00')[0]?.days).toEqual(['Mo', 'We']);
  });
});

describe('display helpers', () => {
  const periods = parseOpeningHours('Mo-Fr 09:30-19:00; Sa-Su 10:00-19:00');

  it('names day ranges in Hungarian', () => {
    expect(hungarianDayRange(['Mo', 'Tu', 'We', 'Th', 'Fr'])).toBe('Hétfő – Péntek');
    expect(hungarianDayRange(['Tu'])).toBe('Kedd');
    expect(hungarianDayRange(['Mo', 'We'])).toBe('Hétfő, Szerda');
  });

  it('builds timetable rows with the shop-door abbreviations', () => {
    expect(hoursRows(periods)).toEqual([
      { days: 'Hétfő – Péntek', short: 'H–P', time: '9:30–19:00' },
      { days: 'Szombat – Vasárnap', short: 'Szo–V', time: '10:00–19:00' },
    ]);
  });

  it('maps to schema.org opening hours', () => {
    expect(schemaOpeningHours(periods)[1]).toEqual({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday', 'Sunday'],
      opens: '10:00',
      closes: '19:00',
    });
  });
});
