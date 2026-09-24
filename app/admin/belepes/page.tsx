import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/login-form';
import { Wordmark } from '@/components/site/wordmark';
import { OrganicShape } from '@/components/ui/organic-shape';
import { currentAdmin } from '@/lib/auth/guard';
import { safeAdminPath } from '@/lib/auth/redirect';
import { adminEnabled } from '@/lib/config/env';

export const metadata: Metadata = { title: 'Belépés' };

const NOTICES: Record<string, string> = {
  inaktiv: 'Biztonsági okból 15 perc tétlenség után újra be kell jelentkezned.',
  lejart: 'A munkamenet lejárt. Jelentkezz be újra.',
  biztonsag: 'Biztonsági okból kijelentkeztettünk minden eszközről. Jelentkezz be újra.',
  kilepve: 'Sikeresen kijelentkeztél.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeAdminPath(typeof params.next === 'string' ? params.next : null);
  const notice = typeof params.ok === 'string' ? NOTICES[params.ok] : undefined;

  const session = await currentAdmin();
  if (session.ok && session.principal.mfaComplete) redirect(next);

  return (
    <main className="relative grid min-h-screen place-items-center overflow-x-clip px-gutter py-16">
      <OrganicShape
        shape="leaf"
        className="absolute -right-40 -top-40 w-[34rem] rotate-12 text-sage-50"
      />
      <div className="relative w-full max-w-md rounded-panel bg-white p-7 shadow-soft sm:p-10">
        <Wordmark />
        <h1 className="mt-8 font-display text-display-md text-ink">Belépés az adminisztrációba</h1>
        {notice ? (
          <p
            role="status"
            className="mt-4 rounded-control bg-sage-50 px-4 py-3 text-small text-ink"
          >
            {notice}
          </p>
        ) : null}
        {adminEnabled() ? (
          <LoginForm next={next} />
        ) : (
          <p className="mt-6 text-body text-ink-soft">
            Az adminisztráció ezen a szerveren nincs bekapcsolva (hiányzik az aláíró kulcs).
          </p>
        )}
      </div>
    </main>
  );
}
