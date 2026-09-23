import Image from 'next/image';
import beans from '@/assets/images/beans-still-life.jpg';
import { Parallax } from '@/components/motion';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Patch } from '@/components/ui/patch';
import { Section } from '@/components/ui/section';

const NOTES = [
  { term: 'Pörkölés', detail: 'Világos' },
  { term: 'Ízvilág', detail: 'Enyhén savanykás, mégis erőteljes' },
  { term: 'Ajánljuk', detail: 'Jeges italokhoz és a klasszikus fekete kávéhoz' },
] as const;

/** The coffee itself — the tasting notes the café publishes, set like a roaster's card. */
export function CoffeeStory() {
  return (
    <Section tone="canvas" wave={{ variant: 'flowing', flip: true }} aria-labelledby="coffee-title">
      <Container className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="relative isolate lg:col-span-6">
          <Patch
            surface="canvas"
            shape="leaf"
            className="-left-[9%] -top-[14%] w-[62%] -rotate-12"
          />
          <div className="relative aspect-[4/3] overflow-hidden rounded-media bg-sage-100">
            <Parallax>
              <Image
                src={beans}
                alt="Világos pörkölésű arabica kávébab kerámiatálban, mellette félbevágott barack, pekándió és jázminvirág"
                fill
                placeholder="blur"
                sizes="(min-width: 1344px) 35rem, (min-width: 1024px) 45vw, 92vw"
                className="object-cover"
              />
            </Parallax>
          </div>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <h2 id="coffee-title" className="font-display text-display-lg text-ink">
            Barack, jázmin, pekándió.
          </h2>
          <p className="mt-6 text-lead text-ink-soft">
            Kávénk 100% prémium minőségű arabica kávébabból készül. Komplex ízvilágát a friss
            barack, a jázmin és a pekándió jellemzi.
          </p>
          <dl className="mt-8 divide-y divide-line border-y border-line">
            {NOTES.map((note) => (
              <div key={note.term} className="grid grid-cols-[7.5rem_1fr] gap-4 py-4 text-body">
                <dt className="text-ink-soft">{note.term}</dt>
                <dd className="text-ink">{note.detail}</dd>
              </div>
            ))}
          </dl>
          <ButtonLink href="/arlista#kavek" variant="quiet" arrow className="mt-8">
            Kávéink az árlistán
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
