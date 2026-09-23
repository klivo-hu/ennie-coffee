/**
 * External links the café can show: social profiles and online-ordering platforms. They share
 * one table and one admin screen, but the site treats them differently — social profiles appear
 * in the "Kövess minket" section and the footer icons; ordering platforms appear as the
 * "Online rendelés" call to action. One list, so the database enum, the server validation, the
 * admin form, and the public icon set cannot drift apart.
 */
export const SOCIAL_PLATFORMS = [
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'google',
  'tripadvisor',
  'foodora',
  'wolt',
  'website',
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORMS)[number];

/** Delivery and ordering services — calls to action, not social media. */
export const ORDERING_PLATFORMS: readonly SocialPlatformId[] = ['foodora', 'wolt'];

export const PLATFORM_LABEL: Record<SocialPlatformId, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  google: 'Google',
  tripadvisor: 'Tripadvisor',
  foodora: 'foodora',
  wolt: 'Wolt',
  website: 'Weboldal',
};

/** "a foodorán" / "a Wolton" — the Hungarian locative the call to action needs. */
export const PLATFORM_ON: Partial<Record<SocialPlatformId, string>> = {
  foodora: 'a foodorán',
  wolt: 'a Wolton',
};

export function isSocialPlatform(value: string): value is SocialPlatformId {
  return (SOCIAL_PLATFORMS as readonly string[]).includes(value);
}

export function isOrderingPlatform(value: string): boolean {
  return (ORDERING_PLATFORMS as readonly string[]).includes(value);
}
