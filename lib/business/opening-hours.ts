/**
 * Opening hours, parsed from the schema.org `openingHours` text format so the same string drives
 * the visible timetable and the structured data: `Mo-Fr 09:30-19:00; Sa-Su 10:00-19:00`.
 */

export const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const SCHEMA_DAY: Record<Weekday, string> = {
  Mo: 'Monday',
  Tu: 'Tuesday',
  We: 'Wednesday',
  Th: 'Thursday',
  Fr: 'Friday',
  Sa: 'Saturday',
  Su: 'Sunday',
};

const HUNGARIAN_DAY: Record<Weekday, string> = {
  Mo: 'Hétfő',
  Tu: 'Kedd',
  We: 'Szerda',
  Th: 'Csütörtök',
  Fr: 'Péntek',
  Sa: 'Szombat',
  Su: 'Vasárnap',
};

export interface OpeningPeriod {
  readonly days: readonly Weekday[];
  /** 24h "HH:MM". */
  readonly opens: string;
  readonly closes: string;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function expandDays(token: string): Weekday[] | null {
  const [start, end] = token.split('-') as [string, string | undefined];
  const from = WEEKDAYS.indexOf(start as Weekday);
  if (from === -1) return null;
  if (end === undefined) return [WEEKDAYS[from] as Weekday];
  const to = WEEKDAYS.indexOf(end as Weekday);
  if (to === -1 || to < from) return null;
  return WEEKDAYS.slice(from, to + 1);
}

/**
 * Parses the text format. Malformed segments are dropped rather than guessed: an invalid entry in
 * the environment must never render as invented hours.
 */
export function parseOpeningHours(value: string | undefined): OpeningPeriod[] {
  if (!value) return [];
  const periods: OpeningPeriod[] = [];
  for (const segment of value.split(';')) {
    const match = segment.trim().match(/^([A-Za-z,-]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (!match) continue;
    const [, dayPart, opens, closes] = match as unknown as [string, string, string, string];
    if (!TIME.test(opens) || !TIME.test(closes)) continue;
    const days = dayPart
      .split(',')
      .map((token) => expandDays(token))
      .filter((list): list is Weekday[] => list !== null)
      .flat();
    if (days.length === 0) continue;
    periods.push({ days, opens, closes });
  }
  return periods;
}

/** Standard Hungarian short forms, as on a shop door: H, K, Sze, Cs, P, Szo, V. */
const HUNGARIAN_DAY_SHORT: Record<Weekday, string> = {
  Mo: 'H',
  Tu: 'K',
  We: 'Sze',
  Th: 'Cs',
  Fr: 'P',
  Sa: 'Szo',
  Su: 'V',
};

/** "Hétfő – Péntek" / "Szombat – Vasárnap" / "Kedd". */
export function hungarianDayRange(days: readonly Weekday[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) return '';
  const contiguous = days.every(
    (day, index) => WEEKDAYS.indexOf(day) === WEEKDAYS.indexOf(first) + index,
  );
  if (days.length === 1) return HUNGARIAN_DAY[first];
  if (contiguous) return `${HUNGARIAN_DAY[first]} – ${HUNGARIAN_DAY[last]}`;
  return days.map((day) => HUNGARIAN_DAY[day]).join(', ');
}

/** "09:30" → "9:30", the way Hungarian signage writes it. */
export function displayTime(time: string): string {
  return time.replace(/^0(\d)/, '$1');
}

/** Rows for a visible timetable: "Hétfő – Péntek" · "9:30–19:00", plus the short day form. */
export function hoursRows(periods: readonly OpeningPeriod[]) {
  return periods.map((period) => {
    const first = period.days[0];
    const last = period.days[period.days.length - 1];
    const contiguous = period.days.every(
      (day, index) =>
        first !== undefined && WEEKDAYS.indexOf(day) === WEEKDAYS.indexOf(first) + index,
    );
    const short =
      first && last && first !== last && contiguous
        ? `${HUNGARIAN_DAY_SHORT[first]}–${HUNGARIAN_DAY_SHORT[last]}`
        : period.days.map((day) => HUNGARIAN_DAY_SHORT[day]).join(', ');
    return {
      days: hungarianDayRange(period.days),
      short,
      time: `${displayTime(period.opens)}–${displayTime(period.closes)}`,
    };
  });
}

export function schemaOpeningHours(periods: readonly OpeningPeriod[]) {
  return periods.map((period) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: period.days.map((day) => SCHEMA_DAY[day]),
    opens: period.opens,
    closes: period.closes,
  }));
}
