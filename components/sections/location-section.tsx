import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { ClockIcon, MailIcon, PhoneIcon, PinIcon } from '@/components/ui/icons';
import { Section } from '@/components/ui/section';
import type { SurfaceTone } from '@/components/ui/surface';
import type { WaveVariant } from '@/components/ui/wave-divider';
import { hoursRows } from '@/lib/business/opening-hours';
import { formattedAddress, phoneHref, type BusinessInfo } from '@/lib/config/business';
import { MapEmbed } from './map-embed';

/**
 * Visit details beside the map: address, hours, phone and email, with directions one tap away.
 * Used on the home page and, with a different heading, on the contact page.
 */
export function LocationSection({
  info,
  title = 'Hatvan szívében, a Kossuth téren.',
  lead = 'A belváros közepén találsz meg minket. Asztalt telefonon foglalhatsz.',
  tone = 'paper',
  wave = { variant: 'gentle' },
  headingLevel = 'h2',
  spacing = 'default',
}: {
  info: BusinessInfo;
  title?: string;
  lead?: string;
  tone?: SurfaceTone;
  /** Pass null when the previous region shares this tone. */
  wave?: { variant?: WaveVariant; flip?: boolean } | null;
  headingLevel?: 'h2' | 'h3';
  spacing?: 'default' | 'top-flush';
}) {
  const Heading = headingLevel;
  const address = formattedAddress(info);
  const hours = hoursRows(info.openingHours);

  return (
    <Section
      tone={tone}
      wave={wave ?? undefined}
      spacing={spacing === 'default' ? 'default' : 'none'}
      className={spacing === 'top-flush' ? 'pb-section' : undefined}
      aria-labelledby="location-title"
    >
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <Heading id="location-title" className="font-display text-display-lg text-ink">
            {title}
          </Heading>
          <p className="mt-5 max-w-md text-lead text-muted">{lead}</p>

          <dl className="mt-10 grid gap-7">
            <div className="grid grid-cols-[2rem_1fr] gap-3">
              <dt>
                <PinIcon className="mt-0.5 size-5 text-sage-700" />
                <span className="sr-only">Cím</span>
              </dt>
              <dd className="text-body text-ink">{address}</dd>
            </div>
            {hours.length > 0 ? (
              <div className="grid grid-cols-[2rem_1fr] gap-3">
                <dt>
                  <ClockIcon className="mt-0.5 size-5 text-sage-700" />
                  <span className="sr-only">Nyitvatartás</span>
                </dt>
                <dd>
                  <table className="w-full max-w-xs text-body">
                    <caption className="sr-only">Nyitvatartás</caption>
                    <tbody>
                      {hours.map((row) => (
                        <tr key={row.days}>
                          <th scope="row" className="py-0.5 pr-6 text-left font-normal text-muted">
                            {row.days}
                          </th>
                          <td className="tabular py-0.5 text-right text-ink">{row.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </dd>
              </div>
            ) : null}
            {info.phone ? (
              <div className="grid grid-cols-[2rem_1fr] gap-3">
                <dt>
                  <PhoneIcon className="mt-0.5 size-5 text-sage-700" />
                  <span className="sr-only">Telefon</span>
                </dt>
                <dd>
                  <a
                    href={phoneHref(info.phone)}
                    className="text-body text-ink underline decoration-ink/20 underline-offset-4 hover:decoration-ink"
                  >
                    {info.phone}
                  </a>
                  <span className="mt-0.5 block text-small text-muted">
                    Asztalfoglalás telefonon
                  </span>
                </dd>
              </div>
            ) : null}
            {info.email ? (
              <div className="grid grid-cols-[2rem_1fr] gap-3">
                <dt>
                  <MailIcon className="mt-0.5 size-5 text-sage-700" />
                  <span className="sr-only">E-mail</span>
                </dt>
                <dd>
                  <a
                    href={`mailto:${info.email}`}
                    className="break-all text-body text-ink underline decoration-ink/20 underline-offset-4 hover:decoration-ink"
                  >
                    {info.email}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href={info.directionsUrl} external arrow>
              Útvonaltervezés
            </ButtonLink>
            {info.phone ? (
              <ButtonLink href={phoneHref(info.phone)} variant="secondary">
                <PhoneIcon className="size-4" />
                Hívj minket
              </ButtonLink>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-7">
          <MapEmbed
            embedUrl={info.mapEmbedUrl}
            directionsUrl={info.directionsUrl}
            address={address}
          />
        </div>
      </Container>
    </Section>
  );
}
