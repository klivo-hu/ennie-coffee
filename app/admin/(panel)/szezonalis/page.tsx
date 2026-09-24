import type { Metadata } from 'next';
import { SeasonalManager } from '@/components/admin/seasonal-manager';
import { getSeasonalSection } from '@/lib/admin/seasonal';
import { guardAdminPage } from '@/lib/auth/page-guard';

export const metadata: Metadata = { title: 'Szezonális' };

export default async function SeasonalPage() {
  const guard = await guardAdminPage();
  if (guard.state !== 'ok') return null;
  const section = await getSeasonalSection();
  return <SeasonalManager section={section} />;
}
