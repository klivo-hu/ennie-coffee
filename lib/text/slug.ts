/**
 * URL-safe slugs from Hungarian names: "Ízesített jegeskávé" → "izesitett-jegeskave".
 * Diacritics (including the double acutes ő and ű) are folded to their base letters.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' es ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
