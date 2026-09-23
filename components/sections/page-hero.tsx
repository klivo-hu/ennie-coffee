import { getImageProps, type StaticImageData } from 'next/image';
import { preload } from 'react-dom';
import { HeroMotion } from '@/components/motion/hero-motion';
import { Container } from '@/components/ui/container';
import { OrganicShape } from '@/components/ui/organic-shape';

/**
 * The shared subpage header: a clear title and one or two lines of context, with a small arched
 * image on a sage form. Compact on purpose — it sets the page's hierarchy and gets out of the way,
 * so the content starts within the first screen on a phone.
 */
export function PageHero({
  title,
  lead,
  image,
  imageAlt,
  children,
}: {
  title: string;
  lead: string;
  image?: StaticImageData;
  imageAlt?: string;
  children?: React.ReactNode;
}) {
  return (
    <section aria-labelledby="page-title" className="relative overflow-x-clip bg-ivory">
      <HeroMotion variant="page">
        <Container className="grid items-end gap-10 pb-24 pt-10 md:grid-cols-12 md:pb-32 md:pt-16">
          <div className="md:col-span-7 lg:col-span-7">
            <h1
              id="page-title"
              className="font-display text-display-lg text-ink md:text-display-xl"
            >
              {/* Headroom inside the mask keeps accented capitals (Á, É, Ő, Ű) from being clipped. */}
              <span className="-mt-[0.2em] block overflow-hidden pb-[0.1em] pt-[0.2em]">
                <span data-hero-line className="block">
                  {title}
                </span>
              </span>
            </h1>
            <p data-hero-enter className="mt-5 max-w-xl text-lead text-ink-soft">
              {lead}
            </p>
            {children ? (
              <div data-hero-enter className="mt-8">
                {children}
              </div>
            ) : null}
          </div>

          {image ? (
            <div className="relative hidden md:col-span-5 md:block lg:col-span-4 lg:col-start-9">
              <OrganicShape
                data-hero-shape
                shape="leaf"
                className="absolute -right-[22%] -top-[16%] w-[120%] rotate-[12deg] text-sage-100"
              />
              <div className="arch relative ml-auto aspect-[4/5] w-full max-w-[18rem] overflow-hidden bg-sage-100">
                <div data-hero-image className="absolute inset-0">
                  <HeroImage image={image} alt={imageAlt ?? ''} />
                </div>
                <div
                  data-hero-curtain
                  aria-hidden="true"
                  className="absolute inset-0 bg-sage-200"
                />
              </div>
            </div>
          ) : null}
        </Container>
      </HeroMotion>
    </section>
  );
}

/** Where the hero image is shown (it is hidden below md); the same query gates its download. */
const SHOWN_FROM = '(min-width: 768px)';
/** 1×1 transparent GIF: the <img> falls back to it where the image is hidden, so nothing loads. */
const NOTHING = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAACH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * The hero image, requested only on screens that show it. next/image's `priority` would preload a
 * candidate on phones too, where the image is display:none; here the preload and the <source>
 * carry the same media query, and the fallback <img> points at an inline pixel.
 */
function HeroImage({ image, alt }: { image: StaticImageData; alt: string }) {
  const {
    props: { srcSet, sizes, ...img },
  } = getImageProps({
    src: image,
    alt,
    fill: true,
    priority: true,
    fetchPriority: 'high',
    placeholder: 'blur',
    sizes: '(min-width: 1024px) 18rem, 36vw',
    className: 'object-cover',
  });
  preload(img.src, {
    as: 'image',
    imageSrcSet: srcSet,
    imageSizes: sizes,
    fetchPriority: 'high',
    media: SHOWN_FROM,
  });
  return (
    <picture>
      <source media={SHOWN_FROM} srcSet={srcSet} sizes={sizes} />
      <img {...img} src={NOTHING} alt={alt} />
    </picture>
  );
}
