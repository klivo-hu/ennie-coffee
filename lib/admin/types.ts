import type { SeasonalStyle } from '@/lib/seasonal/styles';

/** Shapes the admin API returns. Shared by the route handlers and the admin UI. */

export interface AdminImage {
  readonly id: string;
  readonly previewUrl: string;
  readonly dominantColor: string;
}

export interface AdminPrice {
  readonly label: string | null;
  readonly amountHuf: number;
}

export interface AdminProduct {
  readonly id: string;
  readonly categoryId: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly qualifier: 'exact' | 'from';
  readonly prices: readonly AdminPrice[];
  readonly isVisible: boolean;
  readonly isArchived: boolean;
  readonly sortOrder: number;
  readonly image: AdminImage | null;
  readonly updatedAt: string;
}

export interface AdminCategory {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly note: string | null;
  readonly isVisible: boolean;
  readonly sortOrder: number;
  readonly image: AdminImage | null;
  readonly productCount: number;
}

export interface AdminSocialLink {
  readonly id: string;
  readonly platform: string;
  readonly url: string;
  readonly handle: string | null;
  readonly isVisible: boolean;
  readonly sortOrder: number;
}

export interface AdminAuditEntry {
  readonly id: number;
  readonly at: string;
  readonly actorUsername: string | null;
  readonly action: string;
  readonly entity: string | null;
  readonly ip: string | null;
}

export interface AdminSeasonalItem {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly ingredients: readonly string[];
  readonly qualifier: 'exact' | 'from';
  readonly prices: readonly AdminPrice[];
  readonly isVisible: boolean;
  readonly image: AdminImage | null;
}

export interface AdminSeasonalSection {
  readonly isEnabled: boolean;
  readonly title: string;
  readonly lead: string | null;
  readonly note: string | null;
  readonly homeStyle: SeasonalStyle;
  readonly listStyle: SeasonalStyle;
  /** In showing order; the admin list reorders this array. */
  readonly items: readonly AdminSeasonalItem[];
}
