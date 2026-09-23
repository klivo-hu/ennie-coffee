import { Hanken_Grotesk, Newsreader } from 'next/font/google';

/**
 * Type system (see .claude/memory/design-system.md):
 * - Newsreader — the display voice. A warm editorial serif with an optical-size axis, so large
 *   headings get finer contrast and small ones stay sturdy.
 * - Hanken Grotesk — body and interface text: open, highly legible at small sizes.
 *
 * `subsets` decides only what is preloaded: every subset stays declared in the CSS with its
 * unicode-range, and the browser fetches a file the moment the page contains one of its glyphs.
 * - Hanken Grotesk preloads `latin-ext` too: running text carries the Hungarian double-acute ő/Ő
 *   and ű/Ű on every page, and the file is small (≈20 KB).
 * - Newsreader preloads `latin` only (upright and italic — the italic is in the header wordmark
 *   on every page). Its `latin-ext` files are ≈90 KB each and only needed when a heading holds an
 *   ő or ű, so they load on demand instead of on every page view.
 *
 * Fonts are self-hosted by Next at build time — no request ever reaches a third-party font server
 * from a visitor's browser.
 */
export const displayFont = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  display: 'swap',
  variable: '--font-display',
  adjustFontFallback: true,
});

export const sansFont = Hanken_Grotesk({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-sans',
  adjustFontFallback: true,
});
