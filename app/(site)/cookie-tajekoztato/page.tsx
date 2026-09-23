import type { Metadata } from 'next';
import { Link } from '@/components/ui/link';
import { ConsentSettingsButton } from '@/components/consent/consent-settings-button';
import { LegalPage } from '@/components/legal/legal-page';
import { CONSENT_MAX_AGE_DAYS, CONSENT_STORAGE_KEY } from '@/lib/consent/config';
import { legal } from '@/lib/config/legal';

export const metadata: Metadata = {
  title: 'Cookie tájékoztató',
  description:
    'Milyen sütiket használ az Ennie Coffee weboldala, és hogyan módosíthatod a beállításaidat.',
  alternates: { canonical: '/cookie-tajekoztato' },
};

/**
 * Cookie notice. The table lists exactly the cookies this code sets (names and lifetimes are read
 * from the same constants the code uses) plus the third-party embed that is gated behind consent.
 */
export default function CookiePage() {
  const info = legal();

  return (
    <LegalPage
      title="Cookie tájékoztató"
      path="/cookie-tajekoztato"
      effectiveDate={info.effectiveDate}
    >
      <p>
        A süti (cookie) kis adatfájl, amelyet a böngésző tárol. Weboldalunk nem használ analitikai
        vagy hirdetési sütiket. A működéshez szükséges sütiken túl egyetlen külső tartalmat, a
        Google Térképet ágyazzuk be — ez csak a hozzájárulásoddal töltődik be.
      </p>

      <h2>Feltétlenül szükséges sütik</h2>
      <p>Ezek nélkül az oldal nem működne megfelelően, ezért nem kapcsolhatók ki.</p>
      <table>
        <thead>
          <tr>
            <th scope="col">Név</th>
            <th scope="col">Cél</th>
            <th scope="col">Időtartam</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{CONSENT_STORAGE_KEY}</td>
            <td>Megjegyzi a süti-beállításokkal kapcsolatos döntésedet.</td>
            <td>{CONSENT_MAX_AGE_DAYS} nap</td>
          </tr>
          <tr>
            <td>__Host-ennie_at</td>
            <td>Csak a munkatársaknak: az adminisztrációs felület belépését igazolja.</td>
            <td>10 perc</td>
          </tr>
          <tr>
            <td>__Secure-ennie_rt</td>
            <td>Csak a munkatársaknak: a biztonságos munkamenet megújítása.</td>
            <td>legfeljebb 12 óra</td>
          </tr>
          <tr>
            <td>__Secure-ennie_mfa</td>
            <td>Csak a munkatársaknak: a kétlépcsős azonosítás folyamatban lévő lépése.</td>
            <td>5 perc</td>
          </tr>
        </tbody>
      </table>

      <h2>Külső tartalmak</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Szolgáltatás</th>
            <th scope="col">Cél</th>
            <th scope="col">Mikor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Google Térkép (Google Ireland Ltd.)</td>
            <td>
              A kávézó helyének megjelenítése. A Google saját sütiket helyezhet el (
              <a
                href="https://policies.google.com/technologies/cookies?hl=hu"
                target="_blank"
                rel="noopener noreferrer"
              >
                a Google sütikről szóló tájékoztatója
              </a>
              ).
            </td>
            <td>Csak hozzájárulás után</td>
          </tr>
        </tbody>
      </table>

      <h2>A beállítások módosítása</h2>
      <p>
        Döntésedet bármikor megváltoztathatod vagy visszavonhatod:{' '}
        <ConsentSettingsButton className="text-sage-800 underline decoration-sage-800/30 underline-offset-4 hover:decoration-sage-800" />
        . A sütiket a böngésződ beállításaiban is törölheted. A személyes adatok kezeléséről az{' '}
        <Link href="/adatkezelesi-tajekoztato">Adatkezelési tájékoztatóban</Link> olvashatsz.
      </p>
    </LegalPage>
  );
}
