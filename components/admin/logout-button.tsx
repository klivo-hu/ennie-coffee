'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

/** Ends the session on the server, then leaves the admin. */
export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(
          () => undefined,
        );
        window.location.assign('/admin/belepes?ok=kilepve');
      }}
    >
      {busy ? 'Kilépés…' : 'Kijelentkezés'}
    </Button>
  );
}
