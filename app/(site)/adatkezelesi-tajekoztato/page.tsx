import type { Metadata } from 'next';
import { Link } from '@/components/ui/link';
import { FactList, FieldValue, LegalPage } from '@/components/legal/legal-page';
import { legal } from '@/lib/config/legal';

export const metadata: Metadata = {
  title: 'Adatkezelési tájékoztató',
  description:
    'Milyen személyes adatokat kezel az Ennie Coffee weboldala, milyen célból, és milyen jogaid vannak.',
  alternates: { canonical: '/adatkezelesi-tajekoztato' },
};

/**
 * Privacy notice under the GDPR (Regulation (EU) 2016/679) and Act CXII of 2011 (Infotv.).
 * It describes what this software actually does — the retention periods below are the ones the
 * application enforces. Draft wording — to be reviewed by qualified counsel before publication.
 */
export default function PrivacyPage() {
  const info = legal();

  return (
    <LegalPage
      title="Adatkezelési tájékoztató"
      path="/adatkezelesi-tajekoztato"
      effectiveDate={info.effectiveDate}
    >
      <p>
        Ez a tájékoztató bemutatja, milyen személyes adatokat kezelünk a weboldal használata során,
        milyen célból és jogalapon, meddig őrizzük őket, és milyen jogok illetnek meg.
      </p>

      <h2>Az adatkezelő</h2>
      <FactList
        fields={[info.operatorName, info.registeredAddress, info.contactEmail, info.contactPhone]}
      />

      <h2>Milyen adatokat kezelünk?</h2>

      <h3>A weboldal látogatása</h3>
      <p>
        A weboldal kiszolgálásához és biztonságos működéséhez a szerver technikai adatokat rögzít:
        IP-címet, a kérés időpontját, a megnyitott oldal címét és a böngésző típusát.
      </p>
      <ul>
        <li>
          <strong>Cél:</strong> a weboldal működtetése, a visszaélések (például túlterheléses
          támadások) kiszűrése.
        </li>
        <li>
          <strong>Jogalap:</strong> jogos érdek (GDPR 6. cikk (1) bekezdés f) pont).
        </li>
        <li>
          <strong>Időtartam:</strong> a visszaélés-szűréshez használt, IP-címhez kötött számlálók
          legfeljebb 1 napig maradnak meg; a szervernaplók méretkorlátos körforgással, automatikusan
          törlődnek.
        </li>
      </ul>

      <h3>Sütik és a Google Térkép</h3>
      <p>
        A weboldal csak a működéshez szükséges sütiket használja. A beágyazott Google Térkép csak
        akkor töltődik be, ha ehhez hozzájárulsz; ekkor a Google Ireland Ltd. saját adatkezelési
        szabályai szerint kaphat adatokat a látogatásodról (
        <a
          href="https://policies.google.com/privacy?hl=hu"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google adatvédelmi irányelvek
        </a>
        ). A részleteket a <Link href="/cookie-tajekoztato">Cookie tájékoztató</Link> tartalmazza. A
        hozzájárulásod bármikor visszavonhatod a lábléc „Süti beállítások” pontjában.
      </p>
      <ul>
        <li>
          <strong>Jogalap:</strong> hozzájárulás (GDPR 6. cikk (1) bekezdés a) pont).
        </li>
      </ul>

      <h3>Ha felveszed velünk a kapcsolatot</h3>
      <p>
        Ha telefonon vagy e-mailben keresel meg minket (például asztalfoglalás miatt), a megadott
        nevet, elérhetőséget és az üzenet tartalmát kizárólag a megkeresésed megválaszolására
        használjuk.
      </p>
      <ul>
        <li>
          <strong>Jogalap:</strong> a kérésed teljesítése, illetve jogos érdek (GDPR 6. cikk (1)
          bekezdés b) és f) pont).
        </li>
        <li>
          <strong>Időtartam:</strong> az ügy lezárásáig.
        </li>
      </ul>

      <h3>Az adminisztrációs felület</h3>
      <p>
        A munkatársak belépési adatait (e-mail-cím, jelszókivonat), a munkamenetek IP-címét és
        böngészőjét, valamint az elvégzett módosítások naplóját a felület biztonsága érdekében
        kezeljük. A jelszavakat csak visszafejthetetlen kivonatként tároljuk.
      </p>
      <ul>
        <li>
          <strong>Időtartam:</strong> a lejárt munkamenetek 30 nap, a módosítási napló bejegyzései 1
          év után automatikusan törlődnek.
        </li>
      </ul>

      <h2>Adatfeldolgozó</h2>
      <p>
        A weboldalt és a tárolt adatokat a következő tárhelyszolgáltató üzemelteti:{' '}
        <FieldValue field={info.hostingName} />, <FieldValue field={info.hostingAddress} />.
      </p>

      <h2>Adatbiztonság</h2>
      <p>
        Az adatokat titkosított (HTTPS) kapcsolaton továbbítjuk, az adminisztrációs hozzáférést
        szerepkörökhöz és egyedi jelszóhoz kötjük, a sikertelen belépési kísérleteket korlátozzuk,
        és a rendszert rendszeresen frissítjük.
      </p>

      <h2>Jogaid</h2>
      <ul>
        <li>tájékoztatást és hozzáférést kérhetsz a rólad kezelt adatokhoz;</li>
        <li>kérheted az adatok helyesbítését, törlését vagy kezelésük korlátozását;</li>
        <li>tiltakozhatsz a jogos érdeken alapuló adatkezelés ellen;</li>
        <li>kérheted az adataid hordozható formában történő kiadását;</li>
        <li>a hozzájárulásodat bármikor visszavonhatod.</li>
      </ul>
      <p>
        Kérésedet az adatkezelő fenti elérhetőségein jelezheted; legkésőbb egy hónapon belül
        válaszolunk.
      </p>

      <h2>Jogorvoslat</h2>
      <p>
        Panasszal a Nemzeti Adatvédelmi és Információszabadság Hatósághoz fordulhatsz (NAIH; 1055
        Budapest, Falk Miksa utca 9–11.; postacím: 1363 Budapest, Pf. 9.; telefon: +36 1 391 1400;
        e-mail: ugyfelszolgalat@naih.hu;{' '}
        <a href="https://naih.hu" target="_blank" rel="noopener noreferrer">
          naih.hu
        </a>
        ), illetve bírósághoz is fordulhatsz.
      </p>
    </LegalPage>
  );
}
