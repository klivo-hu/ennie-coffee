import Image from 'next/image';
import baristaPour from '@/assets/images/barista-pour.jpg';
import heroCappuccino from '@/assets/images/hero-cappuccino.jpg';
import { HeroMotion } from '@/components/motion/hero-motion';
import { ButtonLink } from '@/components/ui/button';
import { ClockIcon, PinIcon } from '@/components/ui/icons';
import { Container } from '@/components/ui/container';
import { OrganicShape } from '@/components/ui/organic-shape';
import { hoursRows } from '@/lib/business/opening-hours';
import type { BusinessInfo } from '@/lib/config/business';

/**
 * The home hero. An editorial, asymmetric composition rather than a centered banner: the café's
 * own line set large on the left; on the right an arch-cropped cappuccino standing on a soft
 * organic sage form, with a second, smaller image layered across the gutter.
 *
 * The main image is the page's LCP element. It is painted at first render (the entrance curtain
 * covers it, it does not hide it), requested with high priority, and served as AVIF/WebP at the
 * width the layout actually uses.
 */
export function HomeHero({ info }: { info: BusinessInfo }) {
  const hours = hoursRows(info.openingHours);

  return (
    <section aria-labelledby="hero-title" className="relative overflow-x-clip bg-ivory">
      <HeroMotion>
        <Container className="grid items-center gap-y-14 pb-28 pt-8 md:pb-36 md:pt-12 lg:min-h-[calc(100svh-4.75rem)] lg:grid-cols-12 lg:gap-x-10 lg:pb-32 lg:pt-6">
          <div className="relative z-10 lg:col-span-6">
            <h1 id="hero-title" className="font-display text-display-xl text-ink">
              <span className="-mt-[0.2em] block overflow-hidden pb-[0.08em] pt-[0.2em]">
                <span data-hero-line className="block">
                  Nem csak kávé,
                </span>
              </span>
              <span className="-mt-[0.2em] block overflow-hidden pb-[0.12em] pt-[0.2em]">
                <span data-hero-line className="block italic text-sage-700">
                  szeretettel.
                </span>
              </span>
            </h1>
            <p data-hero-enter className="mt-6 max-w-md text-lead text-ink-soft">
              Prémium arabica kávébabból, világos pörköléssel és minőségi alapanyagokból készítjük
              az italaidat. Nyugodt, barátságos kávéház Hatvan szívében
              {info.foundedYear ? `, ${info.foundedYear} óta.` : '.'}
            </p>
            <div data-hero-enter className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/arlista" arrow>
                Az árlista
              </ButtonLink>
              <ButtonLink href="/kapcsolat" variant="secondary">
                Így találsz meg minket
              </ButtonLink>
            </div>
            <ul data-hero-enter className="mt-10 grid gap-2 text-small text-ink-soft">
              <li className="flex items-center gap-3">
                <PinIcon className="size-[1.125rem] shrink-0 text-sage-700" />
                <span className="sr-only">Cím: </span>
                {info.postalCode} {info.city}, {info.streetAddress}
              </li>
              {hours.length > 0 ? (
                <li className="flex items-center gap-3">
                  <ClockIcon className="size-[1.125rem] shrink-0 text-sage-700" />
                  <span className="sr-only">
                    Nyitvatartás: {hours.map((row) => `${row.days} ${row.time}`).join(', ')}
                  </span>
                  <span aria-hidden="true" className="tabular">
                    {hours.map((row) => `${row.short} ${row.time}`).join(' · ')}
                  </span>
                </li>
              ) : null}
            </ul>
          </div>

          <div className="relative lg:col-span-6">
            <div data-parallax="slow" className="relative mx-auto w-fit lg:mr-0">
              <OrganicShape
                data-hero-shape
                shape="pebble"
                className="absolute -right-[18%] -top-[10%] w-[118%] rotate-[-8deg] text-sage-100"
              />
              <div className="arch relative aspect-[3/4] h-auto w-[min(86vw,26rem)] overflow-hidden bg-sage-100 lg:h-[min(70svh,44rem)] lg:w-auto">
                <div data-hero-image className="absolute inset-0">
                  <Image
                    src={heroCappuccino}
                    alt="Cappuccino rozetta tejhabmintával zsályazöld kerámiacsészében, világos tölgyasztalon, ablakfényben"
                    fill
                    priority
                    fetchPriority="high"
                    placeholder="blur"
                    // Mirrors the frame: min(86vw, 26rem) wide below lg; from lg its width follows its
                    // height, min(52.5vh, 33rem). The 38vw entry is the fallback for browsers that
                    // cannot evaluate min() in sizes — they skip that entry, per the HTML spec.
                    sizes="(min-width: 1024px) min(52.5vh, 33rem), (min-width: 1024px) 38vw, (min-width: 484px) 26rem, 86vw"
                    className="object-cover"
                  />
                </div>
                <div
                  data-hero-curtain
                  aria-hidden="true"
                  className="absolute inset-0 bg-sage-200"
                />
              </div>
            </div>

            <div
              data-hero-accent
              data-parallax="fast"
              className="absolute -bottom-10 left-0 w-[48%] max-w-[17rem] sm:left-[4%] lg:-bottom-8 lg:-left-[6%] lg:w-[40%] lg:max-w-[18rem]"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-panel shadow-lift ring-[6px] ring-ivory">
                <Image
                  src={baristaPour}
                  alt="Barista kiönti a habosított tejet egy zsályazöld csészébe"
                  fill
                  placeholder="blur"
                  sizes="(min-width: 1344px) 14rem, (min-width: 1024px) 18vw, (min-width: 600px) 17rem, 45vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </Container>
      </HeroMotion>
    </section>
  );
}
