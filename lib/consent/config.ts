/**
 * The consent window's purposes and copy.
 *
 * The site sets no analytics or advertising storage, so it asks about exactly one optional
 * purpose: external content — the Google Maps embed, which lets Google set cookies. Asking about
 * purposes the site does not use would itself be misleading. Essential storage (the decision
 * record, and admin sign-in cookies for staff) is disclosed, never toggled.
 *
 * `version` is tied to the purposes below. Change what is asked, raise the version: a decision
 * recorded against older purposes was an answer to a different question, and is treated as absent.
 */

export const CONSENT_VERSION = 1;
export const CONSENT_STORAGE_KEY = 'ennie-consent';
export const CONSENT_MAX_AGE_DAYS = 180;
export const CONSENT_STORAGE_MEDIUM = 'cookie' as 'cookie' | 'local';
export const CONSENT_POLICY_PATH = '/cookie-tajekoztato';
export const CONSENT_PLACEMENT = 'bottom-left-card';
export const CONSENT_BLOCKING = false;
export const CONSENT_SHOW_PURPOSES_UP_FRONT = false;

/** CEF's category id for the purpose; the visitor sees it as external content. */
export const EXTERNAL_MEDIA = 'functional';

export interface ConsentCategory {
  readonly id: string;
  /** Essential purposes are always on and are never presented as a choice. */
  readonly essential: boolean;
  readonly label: string;
  readonly description: string;
}

export const CONSENT_CATEGORIES: readonly ConsentCategory[] = [
  {
    id: 'necessary',
    essential: true,
    label: 'Feltétlenül szükséges',
    description:
      'A hozzájárulási döntésed tárolása, illetve a munkatársak biztonságos belépése az adminisztrációs felületre. Ezek nem kapcsolhatók ki.',
  },
  {
    id: EXTERNAL_MEDIA,
    essential: false,
    label: 'Külső tartalmak (Google Térkép)',
    description:
      'A beágyazott Google Térkép. Betöltéskor a Google sütiket helyezhet el, és adatot kaphat a látogatásodról. Elutasítás esetén a térkép helyén útvonaltervező link jelenik meg.',
  },
];

export const CONSENT_COPY = {
  title: 'Te döntöd el, mit tárolunk',
  body: 'Az oldal csak a működéshez szükséges adatokat tárolja. Egyetlen külső tartalmat használunk, a Google Térképet — ez csak akkor töltődik be, ha engedélyezed.',
  acceptAll: 'Mindet engedélyezem',
  rejectAll: 'Csak a szükségesek',
  customize: 'Beállítások',
  save: 'Választás mentése',
  preferencesTitle: 'Tárolási célok',
  preferencesBody:
    'Minden célt külön engedélyezhetsz. A döntésed bármikor módosíthatod a lábléc „Süti beállítások” pontjában.',
  policyLink: 'Cookie tájékoztató',
  reopen: 'Süti beállítások',
  alwaysOn: 'Mindig aktív',
} as const;

/** The purposes the visitor decides. Essential storage is disclosed, never toggled. */
export const OPTIONAL_CATEGORIES = CONSENT_CATEGORIES.filter((category) => !category.essential);

/** The starting state: nothing non-essential is granted before an answer exists. */
export function defaultGrants(): Record<string, boolean> {
  return Object.fromEntries(
    CONSENT_CATEGORIES.map((category) => [category.id, category.essential]),
  );
}

/** Every purpose granted — the shape `Allow all` writes. */
export function allGranted(): Record<string, boolean> {
  return Object.fromEntries(CONSENT_CATEGORIES.map((category) => [category.id, true]));
}
