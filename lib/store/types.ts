import type { SocialPlatformId } from '@/lib/social/platforms';

/**
 * The stored data model — one type per JSON file under `DATA_DIR`.
 *
 * Money is integer forints (`amountHuf`): HUF has no minor unit in cash use, so an integer is
 * exact and no floating-point arithmetic ever touches a price. Timestamps are ISO-8601 strings in
 * UTC, which survive a JSON round trip unchanged and sort lexicographically. Identifiers are
 * UUIDs, which is what the admin API's route validation expects and what keeps a media directory
 * name free of anything a user chose.
 */

export type AdminRole = 'owner' | 'editor';
export type PriceQualifier = 'exact' | 'from';
export type ImageFormat = 'avif' | 'webp';

/* ------------------------------------------------------------------ media */

export interface MediaVariantRecord {
  readonly format: ImageFormat;
  readonly width: number;
  readonly height: number;
  readonly byteSize: number;
  /** File name inside `media/<id>/`, always `<width>.<format>`. */
  readonly file: string;
}

export interface MediaRecord {
  readonly id: string;
  readonly originalName: string;
  readonly width: number;
  readonly height: number;
  /** Tiny base64 WebP shown while the real variant loads, so a frame is never blank. */
  readonly blurDataUrl: string;
  /** Average colour, painted behind the image before any byte arrives. */
  readonly dominantColor: string;
  readonly createdBy: string | null;
  readonly createdAt: string;
  readonly variants: readonly MediaVariantRecord[];
}

/* ------------------------------------------------------------------ menu */

export interface CategoryRecord {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  /** One or two sentences introducing the category on the price list. */
  readonly description: string | null;
  /** Small print under the category: add-ons, sizes, service notes. */
  readonly note: string | null;
  readonly imageId: string | null;
  readonly sortOrder: number;
  readonly isVisible: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PriceRecord {
  /** Size or variant, e.g. "2,5 dl". Null for a single-price product. */
  readonly label: string | null;
  readonly amountHuf: number;
}

export interface ProductRecord {
  readonly id: string;
  readonly categoryId: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  /** `from` renders "…-tól": the listed price is the smallest option. */
  readonly priceQualifier: PriceQualifier;
  /** Stored with the product: a price never exists without the product it belongs to. */
  readonly prices: readonly PriceRecord[];
  readonly imageId: string | null;
  readonly sortOrder: number;
  readonly isVisible: boolean;
  /** Archived products leave the menu and the admin list but keep their history. */
  readonly isArchived: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SocialLinkRecord {
  readonly id: string;
  readonly platform: SocialPlatformId;
  readonly url: string;
  /** Visible handle, e.g. "@enniecoffee". Optional. */
  readonly handle: string | null;
  readonly isVisible: boolean;
  readonly sortOrder: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/* ------------------------------------------------------------------ admin & auth */

export interface AdminUserRecord {
  readonly id: string;
  /** Sign-in name, compared case-insensitively. */
  readonly username: string;
  readonly passwordHash: string;
  readonly role: AdminRole;
  readonly isActive: boolean;
  /** AES-256-GCM ciphertext of the TOTP secret; never stored in the clear. */
  readonly mfaSecretEncrypted: string | null;
  readonly mfaEnabled: boolean;
  /** Last accepted TOTP time step, so a code cannot be replayed inside its window. */
  readonly mfaLastStep: number | null;
  /** SHA-256 hashes of unused single-use recovery codes. */
  readonly mfaRecoveryCodes: readonly string[];
  readonly failedLoginCount: number;
  readonly failedSinceLastLogin: number;
  /** Failed attempts that preceded the latest successful login — shown to the owner once. */
  readonly previousFailedAttempts: number;
  readonly lockedUntil: string | null;
  readonly lastLoginAt: string | null;
  readonly passwordChangedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Refresh-token sessions. Each rotation writes a new record in the same family and marks the old
 * one rotated; presenting a rotated token again means it was stolen, and the whole family is
 * revoked.
 */
export interface AdminSessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly familyId: string;
  readonly tokenHash: string;
  readonly mfaVerified: boolean;
  readonly createdAt: string;
  readonly lastUsedAt: string;
  /** Absolute lifetime of the family, carried unchanged through rotations. */
  readonly expiresAt: string;
  readonly rotatedAt: string | null;
  readonly revokedAt: string | null;
  readonly revokedReason: string | null;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
}

export interface AuditRecord {
  /** Monotonic within the file; used only as a stable React key and for ordering ties. */
  readonly id: number;
  readonly at: string;
  readonly actorId: string | null;
  readonly action: string;
  readonly entity: string | null;
  readonly entityId: string | null;
  readonly ipAddress: string | null;
  readonly detail: Record<string, unknown> | null;
}
