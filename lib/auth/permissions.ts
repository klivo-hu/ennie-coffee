import type { AdminRole } from '@/lib/store/types';

/**
 * Role model. Authorization is decided on the server from the stored role (not the one in the
 * token), so a role change or deactivation applies on the very next request.
 */
export type Permission =
  | 'content:write' // products, categories, prices
  | 'social:write'
  | 'media:write'
  | 'account:self' // own password and MFA
  | 'audit:read';

const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  owner: ['content:write', 'social:write', 'media:write', 'account:self', 'audit:read'],
  editor: ['content:write', 'social:write', 'media:write', 'account:self'],
};

export function can(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABEL: Record<AdminRole, string> = {
  owner: 'Tulajdonos',
  editor: 'Szerkesztő',
};
