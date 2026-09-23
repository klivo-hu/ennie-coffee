/**
 * Only same-site admin paths are accepted as post-login destinations; anything else (an absolute
 * URL, a protocol-relative "//evil.example", a backslash trick) falls back to the dashboard, so the
 * login flow can never be used as an open redirect.
 */
export function safeAdminPath(value: string | null | undefined): string {
  if (!value) return '/admin';
  if (!value.startsWith('/admin') || value.startsWith('//') || value.includes('\\'))
    return '/admin';
  // eslint-disable-next-line no-control-regex -- rejecting control characters is the point
  if (/[\u0000-\u001F\s]/.test(value)) return '/admin';
  if (value.startsWith('/admin/belepes')) return '/admin';
  return value;
}
