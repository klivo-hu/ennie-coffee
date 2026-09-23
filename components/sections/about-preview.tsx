import Image from 'next/image';
import interior from '@/assets/images/interior.jpg';
import { Parallax } from '@/components/motion';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Patch } from '@/components/ui/patch';
import { Section } from '@/components/ui/section';

/**
 * The place and the person behind it, in two paragraphs — the full story lives on /rolunk. The
 * text sits on the page grid like every other section; only the photograph runs out to the
 * viewport edge.
 */
export function AboutPreview({ foundedYear }: { foundedYear: number | null }) {
  return (
    <Section
      tone="sage"
      wave={{ variant: 'gentle', flip: true }}
      aria-labelledby="about-preview-title"
    >
      <Container className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <h2 id="about-preview-title" className="font-display text-display-lg text-ink">
            Nyugodt sarok a rohanó világban.
          </h2>
          <p className="mt-6 text-lead text-ink">
            {foundedYear ? `${foundedYear} óta` : 'Évek óta'} várjuk a vendégeket Hatvan
            belvárosában. Egy barátságos kávéházat szerettünk volna, ahol megállhatsz egy csésze
            kávéra, és ahol az élet apró örömei kerülnek előtérbe.
          </p>
          <p className="mt-4 text-body text-muted">
            A kávé és az italok készítése nálunk szenvedély: folyamatosan képezzük magunkat, és
            követjük a szakma újdonságait.
          </p>
          <ButtonLink href="/rolunk" variant="secondary" arrow className="mt-9">
            A történetünk
          </ButtonLink>
        </div>
        <div className="relative isolate lg:col-span-7">
          <Patch
            surface="sage"
            shape="drift"
            className="-bottom-[16%] -left-[7%] w-[46%] rotate-[18deg]"
          />
          <div className="relative aspect-[16/10] overflow-hidden rounded-media bg-sage-100 lg:bleed-right lg:rounded-r-none">
            <Parallax>
              <Image
                src={interior}
                alt="Világos, nyugodt kávézóbelső nappali fényben: tölgyasztalok, zsályazöld lambéria, lenvászon függöny"
                fill
                placeholder="blur"
                sizes="(min-width: 1024px) 56vw, 92vw"
                className="object-cover"
              />
            </Parallax>
          </div>
        </div>
      </Container>
    </Section>
  );
}
