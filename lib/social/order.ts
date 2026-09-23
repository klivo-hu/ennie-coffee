import type { SocialLink } from '@/lib/menu/types';
import { PLATFORM_ON, isSocialPlatform } from './platforms';

/** The first configured ordering platform as a call to action: "Rendelés a foodorán". */
export function orderCta(ordering: readonly SocialLink[]): { url: string; label: string } | null {
  const link = ordering[0];
  if (!link) return null;
  const on = isSocialPlatform(link.platform) ? PLATFORM_ON[link.platform] : undefined;
  return { url: link.url, label: on ? `Rendelés ${on}` : 'Online rendelés' };
}
