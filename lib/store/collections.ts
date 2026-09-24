import 'server-only';
import { createCollection } from './json-store';
import type {
  AdminSessionRecord,
  AdminUserRecord,
  AuditRecord,
  CategoryRecord,
  MediaRecord,
  ProductRecord,
  SocialLinkRecord,
} from './types';

/**
 * The site's collections, declared in one place so every file name and every record type is
 * visible together. Each one is a single JSON file in `DATA_DIR`; see `json-store.ts` for the
 * atomicity, durability and locking guarantees they inherit.
 *
 * The split follows how the data changes, not how it is read: the menu (three files) changes when
 * the owner edits it, sessions change on every sign-in, and the audit log only grows. Keeping
 * them apart means a login does not rewrite the menu and a menu edit does not rewrite the log.
 */

export const categoriesStore = createCollection<CategoryRecord>('categories.json');
export const productsStore = createCollection<ProductRecord>('products.json');
export const socialStore = createCollection<SocialLinkRecord>('social.json');

/** Image metadata only. The encoded bytes live under `media/<id>/` — see `lib/media/store.ts`. */
export const mediaStore = createCollection<MediaRecord>('media.json');

export const adminUsersStore = createCollection<AdminUserRecord>('admins.json');
export const sessionsStore = createCollection<AdminSessionRecord>('sessions.json');
export const auditStore = createCollection<AuditRecord>('audit.json');
