import type { StaticImageData } from 'next/image';

/**
 * The menu as the public site consumes it. Both sources — the database and the seed fallback —
 * produce exactly this shape, so no component knows where its data came from.
 */

export interface MediaVariant {
  readonly format: 'avif' | 'webp';
  readonly width: number;
  readonly src: string;
}

export type MenuImage =
  | {
      readonly kind: 'media';
      readonly width: number;
      readonly height: number;
      readonly blurDataUrl: string;
      readonly dominantColor: string;
      readonly variants: readonly MediaVariant[];
    }
  | {
      readonly kind: 'static';
      readonly image: StaticImageData;
    };

export interface MenuPrice {
  readonly label: string | null;
  readonly amountHuf: number;
}

export interface MenuProduct {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly qualifier: 'exact' | 'from';
  readonly prices: readonly MenuPrice[];
  readonly image: MenuImage | null;
}

export interface MenuCategory {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly note: string | null;
  readonly image: MenuImage | null;
  readonly products: readonly MenuProduct[];
}

export interface SocialLink {
  readonly id: string;
  readonly platform: string;
  readonly url: string;
  readonly handle: string | null;
}

export interface SiteContent {
  readonly menu: readonly MenuCategory[];
  /** Social profiles (Instagram, Facebook, …). */
  readonly social: readonly SocialLink[];
  /** Online-ordering platforms (foodora, Wolt) — shown as a call to action, not as social media. */
  readonly ordering: readonly SocialLink[];
  /** `database` in normal operation; `fallback` when the store is absent or unreachable. */
  readonly source: 'database' | 'fallback';
}
