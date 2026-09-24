import { z } from 'zod';
import { MAX_SEASONAL_INGREDIENTS, SEASONAL_STYLES } from '@/lib/seasonal/styles';
import { PLATFORM_LABEL, SOCIAL_PLATFORMS, type SocialPlatformId } from '@/lib/social/platforms';

/**
 * Server-side input contracts for the admin API. The browser forms mirror these for fast
 * feedback, but only these decide what reaches the store. Text is stored as plain text and
 * escaped by React on output, so nothing here needs HTML sanitizing — control characters and
 * oversized values are rejected instead.
 */

// Tabs and newlines are fine in long text; every other C0/C1 control character is refused.
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;

const plainText = (max: number, label: string) =>
  z
    .string({ error: `${label}: szöveget várunk.` })
    .trim()
    .max(max, `${label}: legfeljebb ${max} karakter.`)
    .refine(
      (value) => !CONTROL_CHARS.test(value),
      `${label}: nem megengedett karaktert tartalmaz.`,
    );

const requiredText = (max: number, label: string) =>
  plainText(max, label).refine((value) => value.length > 0, `${label}: kötelező.`);

/** Empty strings from a form become null, so "cleared" and "never set" mean the same thing. */
const optionalText = (max: number, label: string) =>
  z
    .union([plainText(max, label), z.null()])
    .optional()
    .transform((value) => (value === undefined || value === null || value === '' ? null : value));

export const slugSchema = z
  .string()
  .trim()
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Csak kisbetű, szám és kötőjel (pl. "jeges-latte").');

export const priceSchema = z.object({
  label: optionalText(32, 'Kiszerelés'),
  amountHuf: z
    .number({ error: 'Az ár egész forintösszeg legyen.' })
    .int('Az ár egész forintösszeg legyen.')
    .min(0, 'Az ár nem lehet negatív.')
    .max(1_000_000, 'Az ár legfeljebb 1 000 000 Ft lehet.'),
});

const pricesSchema = z
  .array(priceSchema)
  .min(1, 'Legalább egy ár szükséges.')
  .max(6, 'Legfeljebb 6 kiszerelés adható meg.')
  .refine(
    (prices) => prices.length === 1 || prices.every((price) => price.label !== null),
    'Több ár esetén mindegyikhez adj meg kiszerelést (pl. "3,5 dl").',
  );

const imageIdSchema = z.union([z.uuid(), z.null()]).optional();

export const productCreateSchema = z.object({
  categoryId: z.uuid('Válassz kategóriát.'),
  name: requiredText(80, 'Név'),
  slug: slugSchema.optional(),
  description: optionalText(600, 'Leírás'),
  qualifier: z.enum(['exact', 'from']).default('exact'),
  prices: pricesSchema,
  imageId: imageIdSchema,
  isVisible: z.boolean().default(true),
});

export const productUpdateSchema = z
  .object({
    categoryId: z.uuid(),
    name: requiredText(80, 'Név'),
    slug: slugSchema,
    description: optionalText(600, 'Leírás'),
    qualifier: z.enum(['exact', 'from']),
    prices: pricesSchema,
    imageId: imageIdSchema,
    isVisible: z.boolean(),
    isArchived: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nincs módosítandó mező.');

export const categoryCreateSchema = z.object({
  name: requiredText(60, 'Név'),
  slug: slugSchema.optional(),
  description: optionalText(400, 'Bevezető'),
  note: optionalText(300, 'Megjegyzés'),
  imageId: imageIdSchema,
  isVisible: z.boolean().default(true),
});

export const categoryUpdateSchema = z
  .object({
    name: requiredText(60, 'Név'),
    slug: slugSchema,
    description: optionalText(400, 'Bevezető'),
    note: optionalText(300, 'Megjegyzés'),
    imageId: imageIdSchema,
    isVisible: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nincs módosítandó mező.');

export const reorderSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(500),
});

/* ------------------------------------------------------------------ seasonal showcase */

/**
 * Ingredients arrive as a list because that is how they are shown — one chip each. The admin form
 * splits what the owner typed on commas; empty entries are dropped there, and refused here.
 */
const ingredientsSchema = z
  .array(requiredText(48, 'Összetevő'))
  .max(MAX_SEASONAL_INGREDIENTS, `Legfeljebb ${MAX_SEASONAL_INGREDIENTS} összetevő adható meg.`);

export const seasonalSectionUpdateSchema = z
  .object({
    isEnabled: z.boolean(),
    title: requiredText(60, 'Cím'),
    lead: optionalText(400, 'Bevezető'),
    note: optionalText(300, 'Megjegyzés'),
    homeStyle: z.enum(SEASONAL_STYLES, 'Válassz elrendezést.'),
    listStyle: z.enum(SEASONAL_STYLES, 'Válassz elrendezést.'),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nincs módosítandó mező.');

export const seasonalItemCreateSchema = z.object({
  name: requiredText(80, 'Név'),
  description: optionalText(600, 'Leírás'),
  ingredients: ingredientsSchema.default([]),
  qualifier: z.enum(['exact', 'from']).default('exact'),
  prices: pricesSchema,
  imageId: imageIdSchema,
  isVisible: z.boolean().default(true),
});

/**
 * Declared field by field rather than as a `.partial()` of the create schema: the defaults there
 * would turn an omitted field into an overwrite instead of leaving the stored value alone.
 */
export const seasonalItemUpdateSchema = z
  .object({
    name: requiredText(80, 'Név'),
    description: optionalText(600, 'Leírás'),
    ingredients: ingredientsSchema,
    qualifier: z.enum(['exact', 'from']),
    prices: pricesSchema,
    imageId: imageIdSchema,
    isVisible: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nincs módosítandó mező.');

/* ------------------------------------------------------------------ social */

/** Hosts each platform's links may point at. `website` accepts any HTTPS host. */
const PLATFORM_HOSTS: Record<SocialPlatformId, readonly string[] | null> = {
  facebook: ['facebook.com', 'fb.com', 'fb.me'],
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'],
  google: ['google.com', 'google.hu', 'g.page', 'maps.app.goo.gl', 'goo.gl'],
  tripadvisor: ['tripadvisor.com', 'tripadvisor.hu', 'tripadvisor.co.uk'],
  foodora: ['foodora.hu'],
  wolt: ['wolt.com'],
  website: null,
};

function hostMatches(host: string, allowed: readonly string[]): boolean {
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function socialUrlProblem(platform: SocialPlatformId, raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return 'Adj meg teljes webcímet (https://…).';
  }
  if (url.protocol !== 'https:') return 'Csak https:// kezdetű cím adható meg.';
  if (url.username || url.password) return 'A cím nem tartalmazhat felhasználónevet vagy jelszót.';
  const allowed = PLATFORM_HOSTS[platform];
  if (allowed && !hostMatches(url.hostname.toLowerCase(), allowed)) {
    return `Ez a cím nem a(z) ${PLATFORM_LABEL[platform]} oldalára mutat.`;
  }
  return null;
}

const socialBase = z.object({
  platform: z.enum(SOCIAL_PLATFORMS, 'Válassz platformot.'),
  url: z.string().trim().max(300, 'Legfeljebb 300 karakter.'),
  handle: optionalText(60, 'Megjelenő név'),
  isVisible: z.boolean().default(true),
});

export const socialCreateSchema = socialBase.superRefine((value, context) => {
  const problem = socialUrlProblem(value.platform, value.url);
  if (problem) context.addIssue({ code: 'custom', path: ['url'], message: problem });
});

export const socialUpdateSchema = socialBase
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nincs módosítandó mező.');

/* ------------------------------------------------------------------ auth */

export const loginSchema = z.object({
  // Deliberately lenient: a malformed name fails like any unknown one, with the generic message.
  username: z.string().trim().toLowerCase().min(1, 'Add meg a felhasználónevet.').max(64),
  password: z.string().min(1, 'Add meg a jelszót.').max(256),
});

export const mfaVerifySchema = z.union([
  z.object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'A kód 6 számjegyből áll.'),
  }),
  z.object({ recoveryCode: z.string().trim().min(8).max(20) }),
]);

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(1).max(256),
});

export const mfaCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'A kód 6 számjegyből áll.'),
});

export const mfaDisableSchema = z.object({
  password: z.string().min(1).max(256),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'A kód 6 számjegyből áll.'),
});
