import type { Metadata } from 'next';
import { FactList, LegalPage } from '@/components/legal/legal-page';
import { business, formattedAddress } from '@/lib/config/business';
import { legal } from '@/lib/config/legal';

export const metadata: Metadata = {
  title: 'Impresszum',
  description: 'Az Ennie Coffee weboldalának üzemeltetői és tárhelyszolgáltatói adatai.',
  alternates: { canonical: '/impresszum' },
};

/**
 * The service-provider disclosure required by Act CVIII of 2001 (Ektv.) 4. §. Every value comes
 * from the environment; see .env.example. Draft wording — to be reviewed by qualified counsel.
 */
export default function ImprintPage() {
  const info = legal();
  const shop = business();

  return (
    <LegalPage title="Impresszum" path="/impresszum" effectiveDate={info.effectiveDate}>
      <h2>A weboldal üzemeltetője</h2>
      <FactList
        fields={[
          info.operatorName,
          info.registeredAddress,
          info.registrationNumber,
          info.registryAuthority,
          info.taxNumber,
          info.representative,
          info.contactEmail,
          info.contactPhone,
        ]}
      />

      <h2>A kávéház</h2>
      <p>
        <strong>{shop.name}</strong> — {formattedAddress(shop)}
      </p>

      <h2>Tárhelyszolgáltató</h2>
      <FactList fields={[info.hostingName, info.hostingAddress, info.hostingContact]} />

      <h2>Szerzői jogok</h2>
      <p>
        A weboldal tartalma — szövegei, arculati elemei és képei — az üzemeltető tulajdona, vagy
        azokat az üzemeltető jogszerűen használja. Előzetes írásos engedély nélkül nem másolhatók és
        nem terjeszthetők.
      </p>
    </LegalPage>
  );
}
