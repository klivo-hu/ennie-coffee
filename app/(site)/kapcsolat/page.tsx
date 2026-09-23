import type { Metadata } from 'next';
import interior from '@/assets/images/interior.jpg';
import { LocationSection } from '@/components/sections/location-section';
import { PageHero } from '@/components/sections/page-hero';
import { SocialSection } from '@/components/sections/social-section';
import { JsonLd } from '@/components/seo/json-ld';
import { business } from '@/lib/config/business';
import { getSiteContent } from '@/lib/content/cache';
import { breadcrumbJsonLd } from '@/lib/seo/jsonld';

export const metadata: Metadata = {
  title: 'Kapcsolat',
  description:
    'Ennie Coffee, 3000 Hatvan, Kossuth tér 10. Nyitvatartás, telefonos asztalfoglalás, e-mail, térkép és útvonaltervezés.',
  alternates: { canonical: '/kapcsolat' },
  openGraph: { url: '/kapcsolat', title: 'Kapcsolat | Ennie Coffee' },
};

/**
 * One place for every action: the hero only sets the scene, and the visit section beneath it
 * carries the address, hours, phone, e-mail, the map, and the two buttons — directions and call.
 */
export default async function ContactPage() {
  const info = business();
  const { social } = await getSiteContent();

  return (
    <>
      <PageHero
        title="Kapcsolat"
        lead="Hatvan belvárosában, a Kossuth téren várunk. Asztalt telefonon foglalhatsz, kérdéseidre e-mailben is szívesen válaszolunk."
        image={interior}
        imageAlt="Világos kávézóbelső tölgyasztalokkal és zsályazöld falakkal"
      />

      <LocationSection
        info={info}
        title="Látogass meg minket"
        lead="Az útvonaltervezés egy érintéssel megnyílik a telefonod térképében."
        tone="canvas"
        wave={null}
        spacing="top-flush"
      />

      <SocialSection links={social} tone="paper" wave={{ variant: 'flowing', flip: true }} />

      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Főoldal', path: '/' },
          { name: 'Kapcsolat', path: '/kapcsolat' },
        ])}
      />
    </>
  );
}
