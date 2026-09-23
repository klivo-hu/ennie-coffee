import type { Metadata } from 'next';
import { desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { guardAdminPage } from '@/lib/auth/page-guard';
import { can } from '@/lib/auth/permissions';
import { connection } from '@/lib/db/client';
import { adminUsers, auditLog } from '@/lib/db/schema';

export const metadata: Metadata = { title: 'Napló' };

const ACTION_LABEL: Record<string, string> = {
  'auth.login': 'Belépés',
  'auth.login_failed': 'Sikertelen belépés',
  'auth.mfa_failed': 'Hibás ellenőrző kód',
  'auth.logout': 'Kijelentkezés',
  'auth.refresh_reuse': 'Munkamenet-visszaélés észlelve',
  'account.password_changed': 'Jelszócsere',
  'account.mfa_enabled': 'Kétlépcsős azonosítás be',
  'account.mfa_disabled': 'Kétlépcsős azonosítás ki',
  'account.recovery_codes_regenerated': 'Új helyreállító kódok',
  'product.created': 'Termék létrehozva',
  'product.updated': 'Termék módosítva',
  'product.deleted': 'Termék törölve',
  'product.reordered': 'Termékek sorrendje',
  'category.created': 'Kategória létrehozva',
  'category.updated': 'Kategória módosítva',
  'category.deleted': 'Kategória törölve',
  'category.reordered': 'Kategóriák sorrendje',
  'social.created': 'Link létrehozva',
  'social.updated': 'Link módosítva',
  'social.deleted': 'Link törölve',
  'social.reordered': 'Linkek sorrendje',
  'media.uploaded': 'Kép feltöltve',
};

const DATE = new Intl.DateTimeFormat('hu-HU', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'Europe/Budapest',
});

/** The latest administrative actions — owner only (checked here, not just hidden in the menu). */
export default async function AuditPage() {
  const guard = await guardAdminPage();
  if (guard.state !== 'ok') return null;
  if (!can(guard.principal.user.role, 'audit:read')) notFound();

  const rows = await connection()
    .db.select({
      id: auditLog.id,
      at: auditLog.at,
      action: auditLog.action,
      ip: auditLog.ipAddress,
      actor: adminUsers.username,
    })
    .from(auditLog)
    .leftJoin(adminUsers, eq(adminUsers.id, auditLog.actorId))
    .orderBy(desc(auditLog.at))
    .limit(150);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-display text-display-md text-ink">Napló</h1>
        <p className="mt-2 text-body text-ink-soft">
          Az utolsó 150 adminisztratív művelet. A bejegyzések 1 év után törlődnek.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-panel bg-white px-6 py-10 text-center text-body text-ink-soft">
          Még nincs bejegyzés.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-panel bg-white">
          <table className="w-full min-w-[40rem] text-left text-small">
            <caption className="sr-only">Adminisztratív műveletek</caption>
            <thead className="border-b border-line text-ink">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Időpont
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Művelet
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Felhasználó
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  IP-cím
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-soft">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-5 py-3 tabular">{DATE.format(row.at)}</td>
                  <td className="px-5 py-3 text-ink">{ACTION_LABEL[row.action] ?? row.action}</td>
                  <td className="px-5 py-3">{row.actor ?? '—'}</td>
                  <td className="px-5 py-3 tabular">{row.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
