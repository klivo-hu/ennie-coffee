/**
 * The menu as published by the café, used to seed an empty database and to render the site when
 * no database is configured (a review preview). Every entry traces to a source:
 *
 * - `foodora`: the current Foodora listing "Ennie 24 Coffee" (product list, grouping, and the
 *   "from" prices shown there — prices on a delivery platform may differ from the counter).
 * - `webnode`: the café's own previous website (enniecoffee5.webnode.hu/arlista). Items found only
 *   there are seeded **hidden**, with that site's prices, so the owner can verify and publish them
 *   from the admin instead of the site presenting possibly outdated prices as current.
 *
 * Descriptions are the sources' own wording, tidied (ordering instructions such as "Kérlek,
 * válassz hozzá tejet!" removed). Nothing here is invented.
 */

export type SeedSource = 'foodora' | 'webnode';

export interface SeedPrice {
  readonly label: string | null;
  readonly amountHuf: number;
}

export interface SeedProduct {
  readonly name: string;
  readonly description: string | null;
  readonly qualifier: 'exact' | 'from';
  readonly prices: readonly SeedPrice[];
  readonly visible: boolean;
  readonly source: SeedSource;
}

export interface SeedCategory {
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly note: string | null;
  /** File name in assets/menu/, processed into the media store on first boot. */
  readonly image: string | null;
  readonly products: readonly SeedProduct[];
}

const from = (amountHuf: number): SeedPrice[] => [{ label: null, amountHuf }];

const foodora = (
  name: string,
  description: string | null,
  prices: SeedPrice[],
  qualifier: 'exact' | 'from' = 'from',
): SeedProduct => ({ name, description, qualifier, prices, visible: true, source: 'foodora' });

const webnodeDraft = (
  name: string,
  description: string | null,
  prices: SeedPrice[],
): SeedProduct => ({
  name,
  description,
  qualifier: 'exact',
  prices,
  visible: false,
  source: 'webnode',
});

export const SEED_MENU: readonly SeedCategory[] = [
  {
    slug: 'kavek',
    name: 'Kávék',
    description:
      '100% prémium arabica kávébabból, világos pörköléssel. Komplex ízvilágát a friss barack, a jázmin és a pekándió jellemzi: enyhén savanykás, mégis karakteres.',
    note: 'Bármelyik kávé koffeinmentes kávéból is kérhető.',
    image: 'kavek.jpg',
    products: [
      foodora(
        'Flat White',
        'Világos pörkölésű, 100% arabica kávébabból készült erős, krémes főzet, meleg krémes tejjel felöntve. 150 ml.',
        from(1300),
      ),
      foodora(
        'Cappuccino',
        'Egy adag 100% arabica espresso, habosított, krémes meleg tejjel felöntve, fahéjjal vagy csokoládéval megszórva.',
        from(1400),
      ),
      foodora(
        'Ízesített cappuccino',
        'Egy adag 100% arabica espresso meleg, krémes tejjel felöntve, egy adag sziruppal ízesítve.',
        from(1590),
      ),
      foodora(
        'Latte',
        'Egy adag 100% arabica espresso meleg, krémes tejjel felöntve, tejhabbal a tetején.',
        from(1890),
      ),
      foodora(
        'Ízesített latte',
        'Latte a választott sziruppal: nutella, karamell, mogyoró, mandula, narancs, mézeskalács, kókusz vagy cukormentes mogyoró.',
        from(2080),
      ),
      foodora('Melange', 'Krémes meleg tej, egy adag espresso és méz.', from(2080)),
      foodora(
        'Jeges latte',
        'Egy adag 100% arabica espresso jéggel, hideg tejjel felöntve.',
        from(1990),
      ),
      foodora(
        'Jegeskávé',
        'Egy adag 100% arabica espresso, egy nagy gombóc vaníliafagylalt, jég és tej, tejszínhabbal díszítve.',
        from(2190),
      ),
      foodora(
        'Ízesített jegeskávé',
        'Jegeskávé fagylalttal és tejszínhabbal, a választott sziruppal ízesítve.',
        from(2380),
      ),
      webnodeDraft(
        'Espresso',
        '100% arabica, prémium minőségű kávébabból, erős, krémes főzet. 30 ml.',
        [{ label: null, amountHuf: 660 }],
      ),
      webnodeDraft('Ristretto', '22 ml erős, krémes főzet, tejjel vagy tejszínnel is kérhető.', [
        { label: null, amountHuf: 660 },
      ]),
      webnodeDraft('Con Panna', '100% arabica espresso egy kis ínycsiklandó tejszínhabbal.', [
        { label: null, amountHuf: 690 },
      ]),
      webnodeDraft('Dupla espresso', 'Két adag erős, krémes főzet. 60 ml.', [
        { label: null, amountHuf: 890 },
      ]),
      webnodeDraft(
        'Cortado',
        'Egy adag krémes, erős espresso meleg tejjel, tejhabbal a tetején. 100 ml.',
        [{ label: null, amountHuf: 870 }],
      ),
      webnodeDraft('Hosszúkávé', 'Egy adag espresso hosszan lefőzve, tejjel is kérhető. 150 ml.', [
        { label: null, amountHuf: 850 },
      ]),
      webnodeDraft('Americano', 'Egy adag espresso meleg vízzel felöntve, tejjel is kérhető.', [
        { label: '2,5 dl', amountHuf: 1450 },
        { label: '3,5 dl', amountHuf: 1550 },
        { label: '4,5 dl', amountHuf: 1650 },
      ]),
      webnodeDraft(
        'Affogato',
        'Egy adag espresso két gombóc vaníliafagylaltra öntve, mogyoróval. 200 ml.',
        [{ label: null, amountHuf: 1290 }],
      ),
      webnodeDraft(
        'Pisztáciás affogato',
        'Egy adag espresso két gombóc vaníliafagylaltra öntve, pisztáciakrémmel. 200 ml.',
        [{ label: null, amountHuf: 1290 }],
      ),
    ],
  },
  {
    slug: 'teak',
    name: 'Matcha és chai',
    description:
      'Bio matcha krémesen elkeverve és fűszeres chai habosított tejjel, melegen vagy jéggel.',
    note: null,
    image: 'teak.jpg',
    products: [
      foodora(
        'Chai latte',
        'Egy adag fűszeres chai krémes, meleg tejjel felöntve, fahéjjal meghintve.',
        from(1990),
      ),
      foodora(
        'Matcha latte',
        'Két adag bio matcha krémesen elkeverve, gőzölt, krémes növényi tejjel felöntve. 350 ml.',
        from(2290),
      ),
      foodora(
        'Jeges matcha latte',
        'Két adag bio matcha krémesen elkeverve, jéggel, hideg növényi tejjel felöntve. 350 ml.',
        from(2390),
      ),
      foodora(
        'Jeges chai latte',
        'Egy adag fűszeres chai jéggel, hideg tejjel felöntve.',
        from(2190),
      ),
      webnodeDraft(
        'Szálas teák',
        'Gyümölcstea, gyömbér-citrom, levendula, jázmin (zöld), fűszeres rooibos, kínai zöld tea, ízesített zöld tea, Bai Mu Dan fehér tea, English Breakfast, fűszeres fekete tea és Earl Grey.',
        [
          { label: 'kicsi', amountHuf: 1190 },
          { label: 'közepes', amountHuf: 1290 },
          { label: 'nagy', amountHuf: 1390 },
        ],
      ),
    ],
  },
  {
    slug: 'tejturmix',
    name: 'Tejturmixok',
    description: 'Tej alapú shake-ek eredeti receptek alapján, melegen vagy fagylalttal hűtve.',
    note: null,
    image: 'tejturmix.jpg',
    products: [
      foodora(
        'Meleg tejturmix',
        'Tej alapú meleg turmix választott ízesítéssel, tejszínhabbal a tetején. 350 ml.',
        from(2200),
      ),
      foodora(
        'Hideg tejturmix',
        'Hideg, tej alapú turmix fagylalttal, tejszínhabbal és választható feltéttel. 350 ml.',
        from(2200),
      ),
    ],
  },
  {
    slug: 'gyumolcs-turmix',
    name: 'Gyümölcsturmixok',
    description: 'Gyümölcs alapú turmixok 100%-os gyümölcslével és friss gyümölcsökkel.',
    note: null,
    image: 'gyumolcs-turmix.jpg',
    products: [
      foodora('Mangó Bomba', 'Mangó, banán, narancslé.', from(1990)),
      foodora('Kókusz Mix', 'Kókusz, ananász, ananászlé, banán.', from(1990)),
      foodora('Nyári Frissítő', 'Eper, banán, ananász, ananászlé.', from(1990)),
      foodora('Málnás Smoothie', 'Málna, narancslé, banán, mangó.', from(1990)),
      foodora('Ennie Mix', 'Málna, kókusz, banán, ananász, ananászlé.', from(1990)),
      foodora('Fahéjas Álom', 'Fahéj, ananász, ananászlé, banán.', from(1990)),
      foodora('Erdei Mix', 'Ananász, erdei gyümölcs, ananászlé, kókusz, mangó.', from(1990)),
      foodora('Trópusi Mix', 'Mangó, ananász, kókusz, banán, ananászlé.', from(1990)),
    ],
  },
  {
    slug: 'limonade',
    name: 'Limonádék',
    description: 'Frissítő italkülönlegességek citrommal és gyümölccsel, jéggel tálalva.',
    note: 'A cukormentes változatok édesítőszerrel készülnek.',
    image: 'limonade.jpg',
    products: [
      foodora(
        'Klasszikus limonádé',
        'Citromos ital, az édes és a savanyú ízek harmonikus keveréke, jéggel tálalva.',
        from(1790),
      ),
      foodora(
        'Málna-menta limonádé',
        'Édes-savanyú ital málna és menta ízével, tökéletes nyári hűsöléshez.',
        from(1790),
      ),
      foodora('Cukormentes bodzás limonádé', 'Édesítőszerrel készítve.', from(1790)),
      foodora('Cukormentes erdei gyümölcs limonádé', 'Édesítőszerrel készítve.', from(1790)),
      foodora('Cukormentes klasszikus limonádé', 'Édesítőszerrel készítve.', from(1790)),
    ],
  },
  {
    slug: 'forro-csokolade',
    name: 'Forró csokoládék',
    description: 'Krémes forró csokoládé tejjel, tejcsokoládés vagy fehércsokoládés változatban.',
    note: null,
    image: 'forro-csokolade.jpg',
    products: [
      foodora(
        'Forró csoki kehely piskótával',
        'Krémes forró csokoládé tejjel, piskótadarabokkal, kevés tejszínhabbal és pillecukorral a tetején. 350 ml.',
        from(2390),
      ),
      foodora(
        'Tejcsokoládés forró csoki',
        'Forró csokoládé kevés tejszínhabbal a tetején, öntettel.',
        from(1990),
      ),
      foodora('Fehércsokoládés forró csoki', 'Forró csokoládé fehércsokoládéval.', from(1990)),
      foodora('Ízesített tejcsokoládés forró csoki', 'Ízesített forró tejcsokoládé.', from(2290)),
      foodora(
        'Ízesített fehércsokoládés forró csoki',
        'Ízesített fehér forró csokoládé.',
        from(2290),
      ),
    ],
  },
  {
    slug: 'valaszthato-tejek',
    name: 'Választható tejek',
    description: 'Tejes italaidat laktózmentes vagy növényi tejjel is kérheted.',
    note: null,
    image: null,
    products: [
      foodora('Mandulatej', 'Növényi alapú tej.', from(190), 'exact'),
      foodora('Zabtej', 'Növényi alapú tej.', from(190), 'exact'),
      foodora('Kókusztej', 'Növényi alapú tej.', from(190), 'exact'),
      foodora('Laktózmentes tej', 'Laktózmentes tejjel készül.', from(140), 'exact'),
    ],
  },
];

/** The café's verified social profiles (Webnode contact page, Instagram, Foodora). */
export const SEED_SOCIAL = [
  { platform: 'instagram', url: 'https://www.instagram.com/enniecoffee/', handle: '@enniecoffee' },
  {
    platform: 'facebook',
    url: 'https://www.facebook.com/enniecoffee/',
    handle: 'Ennie Coffee Hatvan',
  },
  {
    platform: 'foodora',
    url: 'https://www.foodora.hu/restaurant/gtne/ennie-24-coffee',
    handle: 'Ennie 24 Coffee',
  },
] as const;
