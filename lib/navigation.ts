/** The four public pages. Legal pages live in the footer only, never in the main navigation. */
export const PRIMARY_NAV = [
  { href: '/', label: 'Főoldal' },
  { href: '/arlista', label: 'Árlista' },
  { href: '/rolunk', label: 'Rólunk' },
  { href: '/kapcsolat', label: 'Kapcsolat' },
] as const;

export const LEGAL_NAV = [
  { href: '/impresszum', label: 'Impresszum' },
  { href: '/adatkezelesi-tajekoztato', label: 'Adatkezelési tájékoztató' },
  { href: '/cookie-tajekoztato', label: 'Cookie tájékoztató' },
] as const;

export function isActivePath(current: string, href: string): boolean {
  if (href === '/') return current === '/';
  return current === href || current.startsWith(`${href}/`);
}
