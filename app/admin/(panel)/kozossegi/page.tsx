import type { Metadata } from 'next';
import { SocialManager } from '@/components/admin/social-manager';
import { listSocial } from '@/lib/admin/social';
import { guardAdminPage } from '@/lib/auth/page-guard';

export const metadata: Metadata = { title: 'Linkek' };

export default async function SocialPage() {
  const guard = await guardAdminPage();
  if (guard.state !== 'ok') return null;
  const links = await listSocial();
  return <SocialManager links={links} />;
}
