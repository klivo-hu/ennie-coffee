import { describe, expect, it } from 'vitest';
import { safeAdminPath } from './redirect';

describe('safeAdminPath', () => {
  it('keeps admin paths', () => {
    expect(safeAdminPath('/admin/termekek?lathatosag=rejtett')).toBe(
      '/admin/termekek?lathatosag=rejtett',
    );
  });

  it('never becomes an open redirect', () => {
    for (const value of [
      'https://evil.example/admin',
      '//evil.example',
      '/admin\\@evil',
      '/\\evil',
      'javascript:alert(1)',
    ]) {
      expect(safeAdminPath(value)).toBe('/admin');
    }
  });

  it('does not loop back to the sign-in page', () => {
    expect(safeAdminPath('/admin/belepes?next=/admin')).toBe('/admin');
    expect(safeAdminPath(null)).toBe('/admin');
  });
});
