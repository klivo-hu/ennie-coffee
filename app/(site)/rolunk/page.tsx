import type { Metadata } from 'next';
import Image from 'next/image';
import looseLeafTea from '@/assets/images/loose-leaf-tea.jpg';
import tableTop from '@/assets/images/table-top.jpg';
import windowSeat from '@/assets/images/window-seat.jpg';
import { Parallax, Reveal } from '@/components/motion';
import { PageHero } from '@/components/sections/page-hero';
import { JsonLd } from '@/components/seo/json-ld';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Patch } from '@/components/ui/patch';
import { Section } from '@/components/ui/section';
import { business } from '@/lib/config/business';
import { breadcrumbJsonLd } from '@/lib/seo/jsonld';

export const metadata: Metadata = {
  title: 'Rólunk',
  description:
    'Molnár Enikő 2015-ben nyitotta meg kávéházát Hatvanban. Egy nyugodt, barátságos hely, ahol a kávé és az italok készítése szenvedély.',
  alternates: { canonical: '/rolunk' },
  openGraph: { url: '/rolunk', title: 'Rólunk | Ennie Coffee' },
};

/** What the café offers, as described on its own previous website. */
const OFFER = [
  {
    title: 'Prémium kávé',
    body: '100% arabica kávébab, világos pörkölés. Barack, jázmin és pekándió — tökéletes a jeges italokhoz és a klasszikus fekete kávéhoz.',
  },
  {
    title: 'Szálas teák',
    body: 'A szálas teák harmonikus ízvilága: gyümölcs- és gyógyteák, zöld, fehér és fekete teák.',
  },
  {
    title: 'Shake-ek és turmixok',
    body: 'Tej alapú shake-ek és gyümölcs alapú turmixok, eredeti receptek alapján.',
  },
  {
    title: 'Édes finomságok',
    body: 'Szezonálisan változó süteménykínálat, a francia cukrászat minőségi alapanyagaival.',
  },
] as const;

/** Guest words published on the café's previous website ("Rólunk mondták"), lightly tidied. */
const VOICES = [
  'Hangulatos a hely, mintha haza menne az ember. Ennie kedves, mosolygós és nagyon ügyes. Hatalmas választék, isteni volt minden, amit eddig kóstoltam — visszatérő vendég lettem.',
  'Hangulatos hely, nagyon aranyos a kiszolgálás és isteni a sütemény. Kell ennél több?',
  'Bármikor jó ide betérni! A gyömbéres-citromos tea pedig valami isteni.',
] as const;

export default function AboutPage() {
  const info = business();
  const since = info.foundedYear;

  return (
    <>
      <PageHero
        title="Rólunk"
        lead="Nyugodt, barátságos kávéház Hatvan belvárosában, ahol a kávé és az italok készítése szenvedély."
        image={windowSeat}
        imageAlt="Ablakpárkányon pihenő kávéscsésze és nyitott könyv zsályazöld párnák mellett"
      />

      <Section tone="canvas" spacing="none" className="pb-section" aria-labelledby="story-title">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="relative isolate lg:col-span-5">
            <Patch
              surface="canvas"
              shape="pebble"
              className="-bottom-[10%] -left-[14%] w-[82%] rotate-6"
            />
            <div className="relative aspect-[4/5] overflow-hidden rounded-media bg-sage-100 lg:arch">
              <Parallax>
                <Image
                  src={looseLeafTea}
                  alt="Szálas tea üveg teáskannában, mellette két kerámiacsésze, levendula és friss gyömbér"
                  fill
                  placeholder="blur"
                  sizes="(min-width: 1344px) 29rem, (min-width: 1024px) 36vw, 92vw"
                  className="object-cover"
                />
              </Parallax>
            </div>
          </div>
          <div className="lg:col-span-6 lg:col-start-7 lg:pt-10">
            <h2 id="story-title" className="font-display text-display-lg text-ink">
              {since ? `${since} óta Hatvanban` : 'Hatvan belvárosában'}
            </h2>
            <div className="mt-7 space-y-5 text-lead text-ink">
              <p>
                A kávéház tulajdonosa, Molnár Enikő {since ? `${since}-ben` : ''} nyitotta meg első
                vállalkozását Hatvanban. Folyamatos fejlesztések és képzések után 2019-ben bővítette
                a helyet mai formájára.
              </p>
            </div>
            <div className="mt-5 space-y-5 text-body text-muted">
              <p>
                Úgy gondolta, a rohanó, folyton fejlődő világban szükség van egy nyugodt, barátságos
                hangulatú kávéházra — ezt alakította ki a vendégeinek. Fontosnak tartja, hogy
                folyamatosan képezze magát a szakmában, és kövesse a legújabb trendeket.
              </p>
              <p>
                Enikő az élet apró örömeire, az élet ízének élvezetére szeretne ráébreszteni.
                Szívét-lelkét beleadja a munkába, és ez nemcsak a kínálaton, hanem a helyiek
                szeretetén is meglátszik.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="sage" wave={{ variant: 'flowing' }} aria-label="Enikő gondolata">
        <Container>
          <figure className="max-w-4xl">
            <blockquote className="font-display text-display-md italic leading-[1.3] text-ink md:text-display-lg md:leading-[1.2]">
              <p>
                „Szenvedélyemmé vált a kávé és a különböző italok készítése. Nem volt számomra
                kérdés: amit csak tudok, azt meg kell mutatnom a vendégeimnek.”
              </p>
            </blockquote>
            <figcaption className="mt-8 flex items-center gap-4 text-body text-muted">
              <span aria-hidden="true" className="h-px w-10 bg-sage-700/50" />
              <span>
                <span className="font-medium text-ink">Molnár Enikő</span>, tulajdonos
              </span>
            </figcaption>
          </figure>
        </Container>
      </Section>

      <Section tone="paper" wave={{ variant: 'gentle', flip: true }} aria-labelledby="offer-title">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <h2 id="offer-title" className="font-display text-display-lg text-ink">
              Amit nálunk megtalálsz
            </h2>
            <Reveal
              as="ul"
              mode="item"
              className="mt-10 grid gap-x-10 border-t border-line sm:grid-cols-2"
            >
              {OFFER.map((item) => (
                <li key={item.title} className="border-b border-line py-6">
                  <h3 className="font-display text-title text-ink">{item.title}</h3>
                  <p className="mt-2 text-body text-muted">{item.body}</p>
                </li>
              ))}
            </Reveal>
            <ButtonLink href="/arlista" arrow className="mt-10">
              Az árlista
            </ButtonLink>
          </div>
          <div className="relative isolate lg:col-span-5 lg:col-start-8">
            <Patch
              surface="paper"
              shape="drift"
              className="-right-[12%] -top-[12%] w-[70%] -rotate-[14deg]"
            />
            <div className="relative aspect-square overflow-hidden rounded-media bg-sage-100">
              <Parallax>
                <Image
                  src={tableTop}
                  alt="Három csésze kávé tejhabmintával és egy szelet mousse torta felülről fotózva"
                  fill
                  placeholder="blur"
                  sizes="(min-width: 1344px) 29rem, (min-width: 1024px) 36vw, 92vw"
                  className="object-cover"
                />
              </Parallax>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="canvas" wave={{ variant: 'soft' }} aria-labelledby="voices-title">
        <Container>
          <h2 id="voices-title" className="max-w-2xl font-display text-display-lg text-ink">
            Vendégeink mondták
          </h2>
          <Reveal as="ul" mode="item" className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {VOICES.map((quote) => (
              <li key={quote} className="flex">
                <figure className="flex w-full flex-col border-t border-line pt-6">
                  <span
                    aria-hidden="true"
                    className="block font-display text-display-md leading-none text-sage-500"
                  >
                    „
                  </span>
                  <blockquote className="mt-2 font-display text-title italic text-ink">
                    <p>{quote}</p>
                  </blockquote>
                  <figcaption className="mt-auto pt-5 text-small text-muted">
                    Vendégünk véleménye
                  </figcaption>
                </figure>
              </li>
            ))}
          </Reveal>
          <div className="mt-16 flex flex-wrap gap-3">
            <ButtonLink href="/kapcsolat" arrow>
              Gyere el hozzánk
            </ButtonLink>
          </div>
        </Container>
      </Section>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Főoldal', path: '/' },
          { name: 'Rólunk', path: '/rolunk' },
        ])}
      />
    </>
  );
}
