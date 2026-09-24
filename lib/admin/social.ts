import 'server-only';
import type { z } from 'zod';
import { ApiError } from '@/lib/api/route';
import { socialStore } from '@/lib/store/collections';
import { createId, now } from '@/lib/store/json-store';
import type { SocialLinkRecord } from '@/lib/store/types';
import {
  socialUrlProblem,
  type socialCreateSchema,
  type socialUpdateSchema,
} from '@/lib/validation/admin';
import type { AdminSocialLink } from './types';

type CreateInput = z.output<typeof socialCreateSchema>;
type UpdateInput = z.output<typeof socialUpdateSchema>;

export async function listSocial(): Promise<AdminSocialLink[]> {
  return [...(await socialStore.read())]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((record) => ({
      id: record.id,
      platform: record.platform,
      url: record.url,
      handle: record.handle,
      isVisible: record.isVisible,
      sortOrder: record.sortOrder,
    }));
}

export async function createSocial(input: CreateInput): Promise<string> {
  const timestamp = now();
  return socialStore.mutate((items) => {
    const record: SocialLinkRecord = {
      id: createId(),
      platform: input.platform,
      // Normalised through the URL parser, so what is stored is what was validated.
      url: new URL(input.url).toString(),
      handle: input.handle,
      isVisible: input.isVisible,
      sortOrder: items.reduce((max, item) => Math.max(max, item.sortOrder + 1), 0),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return { items: [...items, record], result: record.id };
  });
}

export async function updateSocial(id: string, input: UpdateInput): Promise<void> {
  const current = (await socialStore.read()).find((link) => link.id === id);
  if (!current) throw new ApiError(404, 'not_found', 'A link nem található.');

  // URL and platform are validated together, whichever of them changed.
  const platform = input.platform ?? current.platform;
  const url = input.url ?? current.url;
  const problem = socialUrlProblem(platform, url);
  if (problem) {
    throw new ApiError(422, 'validation', 'Ellenőrizd a megjelölt mezőket.', { url: problem });
  }
  const timestamp = now();

  await socialStore.mutate((items) => {
    const record = items.find((link) => link.id === id);
    if (!record) throw new ApiError(404, 'not_found', 'A link nem található.');
    const next: SocialLinkRecord = {
      ...record,
      platform: input.platform ?? record.platform,
      url: input.url !== undefined ? new URL(input.url).toString() : record.url,
      handle: input.handle !== undefined ? input.handle : record.handle,
      isVisible: input.isVisible ?? record.isVisible,
      updatedAt: timestamp,
    };
    return { items: items.map((link) => (link.id === id ? next : link)), result: undefined };
  });
}

export async function deleteSocial(id: string): Promise<void> {
  await socialStore.mutate((items) => {
    if (!items.some((link) => link.id === id)) {
      throw new ApiError(404, 'not_found', 'A link nem található.');
    }
    return { items: items.filter((link) => link.id !== id), result: undefined };
  });
}

export async function reorderSocial(ids: readonly string[]): Promise<void> {
  const timestamp = now();
  await socialStore.mutate((items) => {
    const position = new Map<string, number>(ids.map((id, index) => [id, index]));
    const known = items.filter((link) => position.has(link.id));
    if (known.length !== new Set(ids).size) {
      throw new ApiError(422, 'validation', 'Ismeretlen link a sorrendben.');
    }
    return {
      items: items.map((link) => {
        const index = position.get(link.id);
        return index === undefined ? link : { ...link, sortOrder: index, updatedAt: timestamp };
      }),
      result: undefined,
    };
  });
}
