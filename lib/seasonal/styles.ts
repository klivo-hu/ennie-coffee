/**
 * The seasonal showcase's shared vocabulary: the layouts the owner can choose between, and the
 * fixed values the section falls back to before it has ever been saved.
 *
 * Client-safe on purpose — the admin form reads the labels, the public section reads the ids, and
 * the server validation reads the list, so the three cannot drift apart.
 */

export const SEASONAL_STYLES = ['editorial', 'arch', 'panel'] as const;

export type SeasonalStyle = (typeof SEASONAL_STYLES)[number];

export const SEASONAL_STYLE_LABEL: Record<SeasonalStyle, string> = {
  editorial: 'Magazin',
  arch: 'Íves',
  panel: 'Kártyás',
};

export const SEASONAL_STYLE_HINT: Record<SeasonalStyle, string> = {
  editorial: 'Nagy, fekvő fotó a szöveg mellett — váltakozva bal és jobb oldalon.',
  arch: 'Álló, ív tetejű fotó, mint az árlista kategóriáinál. Portré fotókhoz.',
  panel: 'A fotó és a szöveg egy lekerekített, fehér kártyán, egymás mellett.',
};

/** Shown until the owner writes their own. */
export const DEFAULT_SEASONAL_TITLE = 'Szezonális újdonságok';
export const DEFAULT_SEASONAL_STYLE: SeasonalStyle = 'editorial';

/** The section's anchor on the price list; de-duplicated against the category slugs on read. */
export const SEASONAL_SLUG = 'szezonalis';

/** The showcase is one record in `seasonal.json`, always under this id. */
export const SEASONAL_SECTION_ID = 'section';

/**
 * A showcase is a handful of highlights, not a second price list: past a few items the page stops
 * reading as news, and the home page grows without bound.
 */
export const MAX_SEASONAL_ITEMS = 8;
export const MAX_SEASONAL_INGREDIENTS = 10;
