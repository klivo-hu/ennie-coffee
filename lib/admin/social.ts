import 'server-only';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { ApiError } from '@/lib/api/route';
import type { Database } from '@/lib/db/client';
import { socialLinks } from '@/lib/db/schema';
import {
  socialUrlProblem,
  type socialCreateSchema,
  type socialUpdateSchema,
} from '@/lib/validation/admin';
import type { AdminSocialLink } from './types';

type CreateInput = z.output<typeof socialCreateSchema>;
type UpdateInput = z.output<typeof socialUpdateSchema>;

export async function listSocial(database: Database): Promise<AdminSocialLink[]> {
  const rows = await database.select().from(socialLinks).orderBy(asc(socialLinks.sortOrder));
  return rows.map((row) => ({
    id: row.id,
    platform: row.platform,
    url: row.url,
    handle: row.handle,
    isVisible: row.isVisible,
    sortOrder: row.sortOrder,
  }));
}

export async function createSocial(database: Database, input: CreateInput): Promise<string> {
  const [{ next } = { next: 0 }] = await database
    .select({ next: sql<number>`coalesce(max(${socialLinks.sortOrder}) + 1, 0)::int` })
    .from(socialLinks);
  const [row] = await database
    .insert(socialLinks)
    .values({
      platform: input.platform,
      url: new URL(input.url).toString(),
      handle: input.handle,
      isVisible: input.isVisible,
      sortOrder: next,
    })
    .returning({ id: socialLinks.id });
  if (!row) throw new Error('Social insert returned no row.');
  return row.id;
}

export async function updateSocial(
  database: Database,
  id: string,
  input: UpdateInput,
): Promise<void> {
  const [current] = await database
    .select()
    .from(socialLinks)
    .where(eq(socialLinks.id, id))
    .limit(1);
  if (!current) throw new ApiError(404, 'not_found', 'A link nem található.');
  // URL and platform are validated together, whichever of them changed.
  const platform = input.platform ?? current.platform;
  const url = input.url ?? current.url;
  const problem = socialUrlProblem(platform, url);
  if (problem)
    throw new ApiError(422, 'validation', 'Ellenőrizd a megjelölt mezőket.', { url: problem });
  await database
    .update(socialLinks)
    .set({
      platform: input.platform,
      url: input.url !== undefined ? new URL(input.url).toString() : undefined,
      handle: input.handle,
      isVisible: input.isVisible,
    })
    .where(eq(socialLinks.id, id));
}

export async function deleteSocial(database: Database, id: string): Promise<void> {
  const deleted = await database
    .delete(socialLinks)
    .where(eq(socialLinks.id, id))
    .returning({ id: socialLinks.id });
  if (deleted.length === 0) throw new ApiError(404, 'not_found', 'A link nem található.');
}

export async function reorderSocial(database: Database, ids: readonly string[]) {
  const rows = await database
    .select({ id: socialLinks.id })
    .from(socialLinks)
    .where(inArray(socialLinks.id, [...ids]));
  if (rows.length !== new Set(ids).size)
    throw new ApiError(422, 'validation', 'Ismeretlen link a sorrendben.');
  await database.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(socialLinks).set({ sortOrder: index }).where(eq(socialLinks.id, id));
    }
  });
}
