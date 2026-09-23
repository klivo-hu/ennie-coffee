import type { Metadata } from 'next';
import { SiteChrome } from '@/components/site/site-chrome';
import { StatusMessage } from '@/components/site/status-message';
import { ButtonLink } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Az oldal nem található',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <SiteChrome>
      <StatusMessage
        code="404"
        title="Ezt az oldalt nem találjuk."
        actions={
          <>
            <ButtonLink href="/" arrow>
              Vissza a főoldalra
            </ButtonLink>
            <ButtonLink href="/arlista" variant="secondary">
              Árlista
            </ButtonLink>
          </>
        }
      >
        <p>
          Lehet, hogy elgépelődött a cím, vagy az oldal időközben elköltözött. A kávé viszont a
          helyén van.
        </p>
      </StatusMessage>
    </SiteChrome>
  );
}
