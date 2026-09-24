import 'server-only';
import { adminUsersStore } from './collections';
import { now } from './json-store';
import type { AdminUserRecord } from './types';

/**
 * Accessors for the administrator accounts. Kept in one place so every caller goes through the
 * same case-insensitive name comparison and the same patch-with-timestamp write, and so the
 * routes never reach into the collection directly.
 */

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * Fields a caller may change. Identity, creation time and the update stamp are not among them:
 * the first two are fixed for the life of an account, and the third is set by `updateAdmin`
 * itself so it cannot be forgotten.
 */
export type AdminUserPatch = Partial<
  Mutable<Omit<AdminUserRecord, 'id' | 'createdAt' | 'updatedAt'>>
>;

export async function findAdminById(id: string): Promise<AdminUserRecord | undefined> {
  return (await adminUsersStore.read()).find((user) => user.id === id);
}

/** Sign-in names are compared case-insensitively, so "Marta" and "marta" are one account. */
export async function findAdminByUsername(
  username: string,
): Promise<AdminUserRecord | undefined> {
  const wanted = username.trim().toLowerCase();
  return (await adminUsersStore.read()).find(
    (user) => user.username.toLowerCase() === wanted,
  );
}

/**
 * Applies `patch` to one account and returns the stored result, or null when the account is gone.
 * The record is re-read inside the lock, so a concurrent change is never silently overwritten by
 * a stale copy read before the call.
 */
export async function updateAdmin(
  id: string,
  patch: AdminUserPatch,
): Promise<AdminUserRecord | null> {
  const timestamp = now();
  return adminUsersStore.mutate<AdminUserRecord | null>((items) => {
    const current = items.find((user) => user.id === id);
    if (!current) return { items: [...items], result: null };
    const next: AdminUserRecord = { ...current, ...patch, updatedAt: timestamp };
    return {
      items: items.map((user) => (user.id === id ? next : user)),
      result: next,
    };
  });
}

/** Username by id, for the audit log's actor column. */
export async function adminUsernamesById(): Promise<Map<string, string>> {
  const users = await adminUsersStore.read();
  return new Map<string, string>(users.map((user) => [user.id, user.username]));
}
