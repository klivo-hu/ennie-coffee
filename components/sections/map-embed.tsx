'use client';

import { useConsent } from '@/components/consent/consent-provider';
import { Button, ButtonLink } from '@/components/ui/button';
import { PinIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { EXTERNAL_MEDIA } from '@/lib/consent/config';

/**
 * The owner-supplied Google Maps embed, loaded only after the visitor allows external content —
 * an iframe that loads first and asks later has already sent the request.
 *
 * The frame keeps a fixed aspect ratio (4:3 on phones, 5:4 from tablet) in both states, so
 * consenting never shifts the layout and the iframe can never decide the page height. Until then,
 * an honest placeholder offers to load the map or open Google Maps directly — never a fake map.
 */
export function MapEmbed({
  embedUrl,
  directionsUrl,
  address,
  className,
}: {
  embedUrl: string;
  directionsUrl: string;
  address: string;
  className?: string;
}) {
  const { allows, grants, save, ready } = useConsent();
  const allowed = allows(EXTERNAL_MEDIA);

  return (
    <div
      className={cn(
        'relative aspect-[4/3] w-full overflow-hidden rounded-media bg-sage-100 md:aspect-[5/4]',
        className,
      )}
    >
      {allowed ? (
        <iframe
          src={embedUrl}
          title={`Térkép: Ennie Coffee, ${address}`}
          className="absolute inset-0 size-full border-0"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-start justify-end gap-5 bg-sage-100 p-6 sm:p-8">
          <PinIcon className="size-7 text-sage-700" />
          <div className="max-w-sm">
            <p className="font-display text-title text-ink">{address}</p>
            <p className="mt-2 text-small text-ink-soft">
              A térképet a Google szolgáltatja. Betöltésével a Google sütiket helyezhet el — ezért
              csak akkor jelenítjük meg, ha engedélyezed.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              size="sm"
              disabled={!ready}
              onClick={() => save({ ...grants, [EXTERNAL_MEDIA]: true })}
            >
              Térkép betöltése
            </Button>
            <ButtonLink href={directionsUrl} external variant="secondary" size="sm">
              Megnyitás a Google Térképen
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}
