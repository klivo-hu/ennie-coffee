import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { ExternalIcon } from '@/components/ui/icons';
import { Section } from '@/components/ui/section';
import type { SurfaceTone } from '@/components/ui/surface';
import type { WaveVariant } from '@/components/ui/wave-divider';
import type { SocialLink } from '@/lib/menu/types';
import { orderCta } from '@/lib/social/order';

/**
 * Delivery as its own call to action — the café is on foodora, which is an ordering channel, not
 * a social profile. Renders nothing when no ordering link is configured in the admin.
 */
export function OrderCta({
  ordering,
  tone = 'paper',
  wave = { variant: 'flowing' },
}: {
  ordering: readonly SocialLink[];
  tone?: SurfaceTone;
  wave?: { variant?: WaveVariant; flip?: boolean };
}) {
  const cta = orderCta(ordering);
  if (!cta) return null;

  return (
    <Section tone={tone} wave={wave} spacing="tight" aria-labelledby="order-title">
      <Container className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id="order-title" className="font-display text-display-md text-ink">
            Otthonra rendelnél?
          </h2>
          <p className="mt-2 max-w-xl text-body text-muted">
            Italaink egy részét online is megrendelheted, házhozszállítással.
          </p>
        </div>
        <ButtonLink href={cta.url} external>
          {cta.label}
          <ExternalIcon className="size-4" />
        </ButtonLink>
      </Container>
    </Section>
  );
}
