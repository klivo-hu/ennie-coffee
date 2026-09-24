import 'server-only';
import { seasonalStore } from '@/lib/store/collections';
import { now } from '@/lib/store/json-store';
import type { SeasonalSectionRecord } from '@/lib/store/types';
import { DEFAULT_SEASONAL_STYLE, DEFAULT_SEASONAL_TITLE, SEASONAL_SECTION_ID } from './styles';

/**
 * Reading and writing the one seasonal showcase record.
 *
 * The collection API stores lists, and this feature is a singleton, so the singleton is kept
 * honest in one place: readers get the stored record or the defaults, and every writer goes
 * through `mutateSeasonalSection`, which upserts under the file's lock. Nothing else needs to
 * know that the file happens to hold a list of one.
 */

/** The section as it is before it has ever been saved: off, unnamed by the owner, empty. */
export function defaultSeasonalSection(timestamp: string = now()): SeasonalSectionRecord {
  return {
    id: SEASONAL_SECTION_ID,
    isEnabled: false,
    title: DEFAULT_SEASONAL_TITLE,
    lead: null,
    note: null,
    homeStyle: DEFAULT_SEASONAL_STYLE,
    listStyle: DEFAULT_SEASONAL_STYLE,
    items: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** The stored section, or the defaults when the file is empty. Never writes. */
export async function readSeasonalSection(): Promise<SeasonalSectionRecord> {
  const records = await seasonalStore.read();
  return records.find((record) => record.id === SEASONAL_SECTION_ID) ?? defaultSeasonalSection();
}

/**
 * Read-modify-write of the section under the file's lock — the equivalent of a short transaction.
 * `update` receives the current section (or the defaults) and returns the complete new one;
 * throwing from it aborts the write. Any stray record in the file is dropped, so a hand-edited
 * file converges on the single record this module expects.
 */
export async function mutateSeasonalSection<R>(
  update: (current: SeasonalSectionRecord) => { section: SeasonalSectionRecord; result: R },
): Promise<R> {
  return seasonalStore.mutate((records) => {
    const current =
      records.find((record) => record.id === SEASONAL_SECTION_ID) ?? defaultSeasonalSection();
    const { section, result } = update(current);
    return { items: [{ ...section, id: SEASONAL_SECTION_ID }], result };
  });
}
