import type { SeasonalStyle } from '@/lib/seasonal/styles';
import type { StaticImageData } from 'next/image';

/**
 * The menu as the public site consumes it. Both sources — the store and the seed fallback —
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
  /** The seasonal showcase when it is switched on and has at least one visible item. */
  readonly seasonal: SeasonalSection | null;
  /** `store` in normal operation; `fallback` when the data directory is empty or unreadable. */
  readonly source: 'store' | 'fallback';
}

/** One highlighted drink in the seasonal showcase. Priced like a menu product, shown larger. */
export interface SeasonalItem {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly ingredients: readonly string[];
  readonly qualifier: 'exact' | 'from';
  readonly prices: readonly MenuPrice[];
  readonly image: MenuImage | null;
}

export interface SeasonalSection {
  /** Anchor on the price list, guaranteed not to collide with a category's slug. */
  readonly slug: string;
  readonly title: string;
  readonly lead: string | null;
  readonly note: string | null;
  readonly homeStyle: SeasonalStyle;
  readonly listStyle: SeasonalStyle;
  readonly items: readonly SeasonalItem[];
}
