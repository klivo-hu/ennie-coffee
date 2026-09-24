import type { Metadata } from 'next';
import { AboutPreview } from '@/components/sections/about-preview';
import { CoffeeStory } from '@/components/sections/coffee-story';
import { HomeHero } from '@/components/sections/home-hero';
import { IntroSection } from '@/components/sections/intro-section';
import { LocationSection } from '@/components/sections/location-section';
import { MenuIndex } from '@/components/sections/menu-index';
import { SeasonalShowcase } from '@/components/sections/seasonal-showcase';
import { SocialSection } from '@/components/sections/social-section';
import { business } from '@/lib/config/business';
import { getSiteContent } from '@/lib/content/cache';
import { orderCta } from '@/lib/social/order';

export const metadata: Metadata = {
  title: { absolute: 'Ennie Coffee – kávéház Hatvanban, a Kossuth téren' },
  description:
    'Nem csak kávé, szeretettel. Prémium arabica világos pörköléssel, matcha és chai latte, turmixok és limonádék Hatvan belvárosában, 2015 óta. Asztalfoglalás telefonon.',
  alternates: { canonical: '/' },
  openGraph: { url: '/' },
};

/**
 * The home page reads as one walk through the café: the welcome, what goes into the cup, what is
 * on right now, the coffee itself, the menu at a glance, the place, where to follow, and how to
 * get there. Each change of surface is marked by the wave.
 *
 * The seasonal showcase comes third, after the welcome has set the tone: it is news, so it sits
 * near the top, but the reader meets the café before meeting this month's drink.
 */
export default async function HomePage() {
  const info = business();
  const { menu, social, ordering, seasonal } = await getSiteContent();

  return (
    <>
      <HomeHero info={info} />
      <IntroSection />
      {seasonal ? (
        <SeasonalShowcase
          section={seasonal}
          variant="home"
          tone="paper"
          wave={{ variant: 'flowing' }}
        />
      ) : null}
      <CoffeeStory />
      <MenuIndex categories={menu} order={orderCta(ordering)} />
      <AboutPreview foundedYear={info.foundedYear} />
      <SocialSection links={social} tone="canvas" wave={{ variant: 'flowing' }} />
      <LocationSection info={info} tone="paper" wave={{ variant: 'soft', flip: true }} />
    </>
  );
}
