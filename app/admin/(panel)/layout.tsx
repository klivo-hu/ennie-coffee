import { Link } from '@/components/ui/link';
import { AdminNav, type AdminNavItem } from '@/components/admin/admin-nav';
import { LogoutButton } from '@/components/admin/logout-button';
import { Wordmark } from '@/components/site/wordmark';
import { guardAdminPage } from '@/lib/auth/page-guard';
import { ROLE_LABEL, can } from '@/lib/auth/permissions';

const NAV: readonly AdminNavItem[] = [
  { href: '/admin', label: 'Áttekintés' },
  { href: '/admin/termekek', label: 'Termékek' },
  { href: '/admin/kategoriak', label: 'Kategóriák' },
  { href: '/admin/kozossegi', label: 'Linkek' },
  { href: '/admin/fiok', label: 'Fiók és biztonság' },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const guard = await guardAdminPage();

  if (guard.state === 'disabled') {
    return (
      <main className="mx-auto max-w-xl px-gutter py-24">
        <h1 className="font-display text-display-md text-ink">
          Az adminisztráció nincs bekapcsolva
        </h1>
        <p className="mt-4 text-body text-ink-soft">
          Ezen a szerveren nincs beállítva adatbázis vagy aláíró kulcs (DATABASE_URL,
          JWT_ACCESS_SECRET). A nyilvános oldal a közzétett árlistával működik tovább. A beállítást
          a docs/environment.md írja le.
        </p>
      </main>
    );
  }

  const { user, mfaComplete } = guard.principal;
  const items = mfaComplete
    ? [...NAV, ...(can(user.role, 'audit:read') ? [{ href: '/admin/naplo', label: 'Napló' }] : [])]
    : NAV.filter((item) => item.href === '/admin/fiok');

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-[90rem] lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-white px-5 pb-3 pt-5 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
        <div className="flex items-center justify-between gap-4 lg:block">
          <Wordmark />
          <p className="text-caption text-ink-soft lg:mt-1">Adminisztráció</p>
        </div>
        <div className="mt-4 lg:mt-8">
          <AdminNav items={items} />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-end gap-3 border-b border-line bg-white/70 px-5 py-3 lg:px-10">
          <p className="mr-auto text-small text-ink-soft">
            <span className="text-ink">{user.username}</span> · {ROLE_LABEL[user.role]}
          </p>
          <Link
            href="/"
            target="_blank"
            className="rounded-inline text-small text-sage-800 underline decoration-sage-800/30 underline-offset-4 hover:decoration-sage-800"
          >
            Weboldal megtekintése<span className="sr-only"> (új lapon)</span>
          </Link>
          <LogoutButton />
        </header>
        <main id="admin-tartalom" className="px-5 py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
