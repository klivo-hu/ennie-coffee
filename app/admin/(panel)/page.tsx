import type { Metadata } from 'next';
import { Link } from '@/components/ui/link';
import { sql } from 'drizzle-orm';
import { guardAdminPage } from '@/lib/auth/page-guard';
import { serverEnv } from '@/lib/config/env';
import { missingLegalFields } from '@/lib/config/legal';
import { connection } from '@/lib/db/client';

export const metadata: Metadata = { title: 'Áttekintés' };

async function counts() {
  const { db } = connection();
  const rows = await db.execute<{
    visible: number;
    hidden: number;
    archived: number;
    categories: number;
    social: number;
  }>(sql`
    select
      (select count(*)::int from products where not is_archived and is_visible) as visible,
      (select count(*)::int from products where not is_archived and not is_visible) as hidden,
      (select count(*)::int from products where is_archived) as archived,
      (select count(*)::int from categories) as categories,
      (select count(*)::int from social_links where is_visible) as social
  `);
  return rows[0] ?? { visible: 0, hidden: 0, archived: 0, categories: 0, social: 0 };
}

export default async function DashboardPage() {
  const guard = await guardAdminPage();
  if (guard.state !== 'ok') return null;
  const { user } = guard.principal;
  const stats = await counts();
  const missing = missingLegalFields();
  const mfaRequired = serverEnv().ADMIN_MFA_REQUIRED;

  const notices: React.ReactNode[] = [];
  if (user.previousFailedAttempts > 0) {
    notices.push(
      <>
        Legutóbbi belépésed előtt{' '}
        <strong>{user.previousFailedAttempts} sikertelen belépési kísérlet</strong> történt a
        fiókodba. Ha nem te voltál, <Link href="/admin/fiok">változtass jelszót</Link>.
      </>,
    );
  }
  if (!user.mfaEnabled && !mfaRequired) {
    notices.push(
      <>
        A kétlépcsős azonosítás nincs bekapcsolva.{' '}
        <Link href="/admin/fiok">Kapcsold be a Fiók oldalon</Link> — pár perc, és a jelszavad
        önmagában már nem elég a belépéshez.
      </>,
    );
  }
  if (stats.hidden > 0) {
    notices.push(
      <>
        <strong>{stats.hidden} termék rejtett.</strong> Közülük néhány a kávézó korábbi weboldaláról
        származik (pl. espresso, szálas teák) — ellenőrizd az árukat, és tedd láthatóvá azokat,
        amelyeket ma is kínáltok.{' '}
        <Link href="/admin/termekek?lathatosag=rejtett">Rejtett termékek</Link>
      </>,
    );
  }
  if (missing.length > 0) {
    notices.push(
      <>
        Az Impresszumból és az adatkezelési tájékoztatóból hiányzik {missing.length} adat:{' '}
        {missing.map((field) => field.label).join(', ')}. Ezeket a szerver <code>.env</code>{' '}
        fájljában kell megadni (lásd <code>.env.example</code>).
      </>,
    );
  }

  const tiles = [
    { label: 'Látható termék', value: stats.visible, href: '/admin/termekek' },
    { label: 'Rejtett termék', value: stats.hidden, href: '/admin/termekek?lathatosag=rejtett' },
    { label: 'Kategória', value: stats.categories, href: '/admin/kategoriak' },
    { label: 'Aktív link', value: stats.social, href: '/admin/kozossegi' },
  ];

  return (
    <div className="grid gap-10">
      <div>
        <h1 className="font-display text-display-md text-ink">Áttekintés</h1>
        <p className="mt-2 text-body text-ink-soft">
          Az itt végzett módosítások azonnal megjelennek a weboldalon.
        </p>
      </div>

      {notices.length > 0 ? (
        <section aria-labelledby="notices-title" className="grid gap-3">
          <h2 id="notices-title" className="text-small font-semibold text-ink">
            Teendők
          </h2>
          <ul className="grid gap-3">
            {notices.map((notice, index) => (
              <li
                key={index}
                className="rounded-panel bg-warning-soft px-5 py-4 text-small text-ink [&_a]:font-medium [&_a]:text-sage-900 [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded-inline [&_code]:bg-white [&_code]:px-1"
              >
                {notice}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="stats-title">
        <h2 id="stats-title" className="sr-only">
          Számok
        </h2>
        <ul className="grid gap-px overflow-hidden rounded-panel bg-line sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map((tile) => (
            <li key={tile.label}>
              <Link
                href={tile.href}
                className="block bg-white px-5 py-5 transition-colors hover:bg-sage-50"
              >
                <span className="block font-display text-display-md tabular text-ink">
                  {tile.value}
                </span>
                <span className="mt-1 block text-small text-ink-soft">{tile.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
