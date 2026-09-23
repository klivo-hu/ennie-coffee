import { eq } from 'drizzle-orm';
import { ApiError, ok, readJson, route } from '@/lib/api/route';
import { audit } from '@/lib/audit';
import { hashPassword, passwordProblem, verifyPassword } from '@/lib/auth/password';
import { revokeAllForUser } from '@/lib/auth/session';
import { connection } from '@/lib/db/client';
import { adminUsers } from '@/lib/db/schema';
import { passwordChangeSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

/** Changing the password re-authenticates with the current one and ends every other session. */
export const POST = route(
  { rateLimit: { tier: 'auth', scope: 'password-change' }, permission: 'account:self' },
  async ({ request, principal, client }) => {
    const user = principal!.user;
    const { currentPassword, newPassword } = await readJson(request, passwordChangeSchema);

    if (!(await verifyPassword(user.passwordHash, currentPassword))) {
      throw new ApiError(422, 'validation', 'Ellenőrizd a megjelölt mezőket.', {
        currentPassword: 'A jelenlegi jelszó nem megfelelő.',
      });
    }
    const problem = passwordProblem(newPassword, { username: user.username });
    if (problem) {
      throw new ApiError(422, 'validation', 'Ellenőrizd a megjelölt mezőket.', {
        newPassword: problem,
      });
    }
    if (await verifyPassword(user.passwordHash, newPassword)) {
      throw new ApiError(422, 'validation', 'Ellenőrizd a megjelölt mezőket.', {
        newPassword: 'Az új jelszó nem egyezhet a jelenlegivel.',
      });
    }

    await connection()
      .db.update(adminUsers)
      .set({ passwordHash: await hashPassword(newPassword), passwordChangedAt: new Date() })
      .where(eq(adminUsers.id, user.id));
    await revokeAllForUser(user.id, 'password-changed', principal!.sessionId);
    await audit({ actorId: user.id, action: 'account.password_changed', ip: client.ip });
    return ok({ ok: true });
  },
);
