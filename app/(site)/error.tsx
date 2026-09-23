'use client';

import { StatusMessage } from '@/components/site/status-message';
import { Button, ButtonLink } from '@/components/ui/button';

/**
 * A page failed to render. The header and footer stay in place (this boundary sits inside the
 * public layout), and the visitor gets a retry and a way home. The error itself was already
 * logged on the server with its digest; nothing internal is shown here.
 */
export default function SiteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <StatusMessage
      title="Valami nem sikerült."
      actions={
        <>
          <Button onClick={reset} arrow>
            Próbáljuk újra
          </Button>
          <ButtonLink href="/" variant="secondary">
            Főoldal
          </ButtonLink>
        </>
      }
    >
      <p>Az oldal most nem töltődött be rendesen. Egy újrapróbálás általában segít.</p>
    </StatusMessage>
  );
}
