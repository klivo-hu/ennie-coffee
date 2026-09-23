import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { SOCIAL_PLATFORMS } from '@/lib/social/platforms';

/**
 * Data model. Money is stored as integer forints (`amount_huf`) — HUF has no minor unit in cash
 * use, so an integer is exact and no floating-point arithmetic ever touches a price. Images are
 * stored in Postgres with their pre-rendered variants so every application instance serves the
 * same bytes and nothing durable lives on a container filesystem.
 */

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ------------------------------------------------------------------ media */

export const imageFormat = pgEnum('image_format', ['avif', 'webp']);

export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  originalName: text('original_name').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  /** Tiny base64 WebP shown while the real variant loads, so a frame is never blank. */
  blurDataUrl: text('blur_data_url').notNull(),
  /** Average color, painted behind the image before any byte arrives. */
  dominantColor: text('dominant_color').notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const mediaVariants = pgTable(
  'media_variants',
  {
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    format: imageFormat('format').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    byteSize: integer('byte_size').notNull(),
    bytes: bytea('bytes').notNull(),
  },
  (table) => [primaryKey({ columns: [table.mediaId, table.format, table.width] })],
);

/* ------------------------------------------------------------------ menu */

export const priceQualifier = pgEnum('price_qualifier', ['exact', 'from']);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    /** One or two sentences introducing the category on the price list. */
    description: text('description'),
    /** Small print under the category: add-ons, sizes, service notes. */
    note: text('note'),
    imageId: uuid('image_id').references(() => media.id, { onDelete: 'set null' }),
    sortOrder: integer('sort_order').notNull().default(0),
    isVisible: boolean('is_visible').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('categories_slug_key').on(table.slug),
    index('categories_sort_idx').on(table.sortOrder),
  ],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    /** `from` renders "…-tól": the listed price is the smallest option. */
    priceQualifier: priceQualifier('price_qualifier').notNull().default('exact'),
    imageId: uuid('image_id').references(() => media.id, { onDelete: 'set null' }),
    sortOrder: integer('sort_order').notNull().default(0),
    isVisible: boolean('is_visible').notNull().default(true),
    /** Archived products leave the menu and the admin list but keep their history. */
    isArchived: boolean('is_archived').notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('products_slug_key').on(table.slug),
    index('products_category_sort_idx').on(table.categoryId, table.sortOrder),
  ],
);

export const productPrices = pgTable(
  'product_prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    /** Size or variant, e.g. "2,5 dl". Null for a single-price product. */
    label: text('label'),
    amountHuf: integer('amount_huf').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    index('product_prices_product_idx').on(table.productId, table.sortOrder),
    check(
      'product_prices_amount_range',
      sql`${table.amountHuf} >= 0 AND ${table.amountHuf} <= 1000000`,
    ),
  ],
);

/* ------------------------------------------------------------------ social */

export const socialPlatform = pgEnum('social_platform', SOCIAL_PLATFORMS);

export const socialLinks = pgTable(
  'social_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    platform: socialPlatform('platform').notNull(),
    url: text('url').notNull(),
    /** Visible handle, e.g. "@enniecoffee". Optional. */
    handle: text('handle'),
    isVisible: boolean('is_visible').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [index('social_links_sort_idx').on(table.sortOrder)],
);

/* ------------------------------------------------------------------ admin & auth */

export const adminRole = pgEnum('admin_role', ['owner', 'editor']);

export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Sign-in name, compared case-insensitively. */
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: adminRole('role').notNull().default('editor'),
    isActive: boolean('is_active').notNull().default(true),
    /** AES-256-GCM ciphertext of the TOTP secret; never stored in the clear. */
    mfaSecretEncrypted: text('mfa_secret_encrypted'),
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    /** Last accepted TOTP time-step, so a code cannot be replayed inside its window. */
    mfaLastStep: bigint('mfa_last_step', { mode: 'number' }),
    /** SHA-256 hashes of unused single-use recovery codes. */
    mfaRecoveryCodes: text('mfa_recovery_codes')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    failedSinceLastLogin: integer('failed_since_last_login').notNull().default(0),
    /** Failed attempts that preceded the latest successful login — shown to the owner once. */
    previousFailedAttempts: integer('previous_failed_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    passwordChangedAt: timestamp('password_changed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps,
  },
  (table) => [uniqueIndex('admin_users_username_key').on(sql`lower(${table.username})`)],
);

/**
 * Refresh-token sessions. Each rotation writes a new row in the same family and marks the old one
 * rotated; presenting a rotated token again means it was stolen, and the whole family is revoked.
 */
export const adminSessions = pgTable(
  'admin_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    mfaVerified: boolean('mfa_verified').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    /** Absolute lifetime of the family, carried unchanged through rotations. */
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedReason: text('revoked_reason'),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
  },
  (table) => [
    uniqueIndex('admin_sessions_token_hash_key').on(table.tokenHash),
    index('admin_sessions_family_idx').on(table.familyId),
    index('admin_sessions_user_idx').on(table.userId),
  ],
);

/** Fixed-window counters shared by every instance, so a limit means the same thing at any scale. */
export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  count: integer('count').notNull(),
});

export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    actorId: uuid('actor_id').references(() => adminUsers.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entity: text('entity'),
    entityId: text('entity_id'),
    ipAddress: text('ip_address'),
    detail: jsonb('detail'),
  },
  (table) => [index('audit_log_at_idx').on(table.at)],
);

export type CategoryRow = typeof categories.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type ProductPriceRow = typeof productPrices.$inferSelect;
export type SocialLinkRow = typeof socialLinks.$inferSelect;
export type AdminUserRow = typeof adminUsers.$inferSelect;
export type AdminSessionRow = typeof adminSessions.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type SocialPlatform = (typeof socialPlatform.enumValues)[number];
export type AdminRole = (typeof adminRole.enumValues)[number];
