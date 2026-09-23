import { Reveal } from '@/components/motion';
import { Container } from '@/components/ui/container';
import { Section } from '@/components/ui/section';

const PRINCIPLES = [
  {
    title: 'Prémium kávébab',
    body: '100% arabica, világos pörköléssel — a kávé karakterét a babtól kezdve komolyan vesszük.',
  },
  {
    title: 'Különleges szirupok',
    body: 'Szezonális ízekkel teszünk egy-egy latte-t vagy forró csokoládét még különlegesebbé.',
  },
  {
    title: 'Saját receptek',
    body: 'Tej alapú shake-ek és gyümölcsturmixok, eredeti receptek alapján.',
  },
] as const;

/** Why the café is worth the visit, in the café's own terms — quality of ingredients first. */
export function IntroSection() {
  return (
    <Section tone="sage" wave={{ variant: 'gentle' }} aria-labelledby="intro-title">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <h2 id="intro-title" className="font-display text-display-lg text-ink">
            Minőségi alapanyagok, gondos kézzel.
          </h2>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <p className="text-lead text-ink">
            Fontos számunkra, hogy minőségi alapanyagokból és prémium kávébabból készüljön a
            frissítő, finom italod. Gyere el, és kóstold végig bőséges kínálatunkat.
          </p>
          <Reveal as="ul" mode="item" className="mt-10 border-t border-sage-900/10">
            {PRINCIPLES.map((item) => (
              <li
                key={item.title}
                className="grid gap-1 border-b border-sage-900/10 py-5 sm:grid-cols-[12rem_1fr] sm:gap-6"
              >
                <h3 className="font-display text-title text-ink">{item.title}</h3>
                <p className="text-body text-muted">{item.body}</p>
              </li>
            ))}
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
