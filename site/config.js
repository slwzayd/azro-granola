// =============================================================================
//  AZRO GRANOLA — CONFIGURATIEBESTAND
// =============================================================================
//  Dit is het ENIGE bestand dat je moet aanpassen om prijzen, smaken, toppings,
//  gewichten, leverkosten en teksten te wijzigen.
//
//  Zowel de website als de server (Netlify Functions) lezen dit bestand.
//  De server rekent het totaal altijd zelf opnieuw uit met deze prijzen.
//
//  Prijzen schrijf je met een PUNT als decimaalteken: 9.50 betekent € 9,50.
//  Na het aanpassen opslaan en de site opnieuw publiceren (zie HANDLEIDING.md).
// =============================================================================

export const CONFIG = {
  // ---------------------------------------------------------------------------
  // 1. ALGEMEEN  ⬅️ PAS AAN
  // ---------------------------------------------------------------------------
  winkel: {
    naam: 'Azro granola',
    instagram: 'azro.granola',
    // E-mailadres dat klanten op de site zien:
    contactEmail: 'hallo@azrogranola.be', // ⬅️ PAS AAN
    // Let op: het adres waar BESTELLINGEN naartoe gaan, stel je in als
    // omgevingsvariabele EIGENAAR_EMAIL in Netlify (nooit hier in het bestand).
  },

  // ---------------------------------------------------------------------------
  // 2. MATEN — gewicht en basisprijs per zakje  ⬅️ PAS AAN
  // ---------------------------------------------------------------------------
  maten: [
    { id: 'medium', naam: 'Medium', gewichtGram: 350, prijs: 9.50 },  // ⬅️ PAS AAN
    { id: 'groot',  naam: 'Groot',  gewichtGram: 650, prijs: 16.50 }, // ⬅️ PAS AAN
  ],

  // ---------------------------------------------------------------------------
  // 3. SOORT — normaal of glutenvrij  ⬅️ PAS AAN
  // ---------------------------------------------------------------------------
  soorten: [
    { id: 'normaal',    naam: 'Normaal',    toeslag: 0,    notitie: 'inbegrepen' },
    { id: 'glutenvrij', naam: 'Glutenvrij', toeslag: 1.00, notitie: '+ € 1,00' }, // ⬅️ PAS AAN
  ],

  // ---------------------------------------------------------------------------
  // 4. TOPPINGS — prijs geldt per topping, per zakje  ⬅️ PAS AAN
  // ---------------------------------------------------------------------------
  toppingPrijs: 1.50, // ⬅️ PAS AAN

  toppings: [
    { id: 'hennepzaad', naam: 'Hennepzaad' },
    { id: 'beepollen',  naam: 'Bee pollen' },
    { id: 'kokos',      naam: 'Kokos gerasp' },
    { id: 'cacaonibs',  naam: 'Cacao nibs' },
  ],

  // ---------------------------------------------------------------------------
  // 5. SMAKEN — welke toppings bij welke smaak mogelijk zijn  ⬅️ PAS AAN
  // ---------------------------------------------------------------------------
  smaken: [
    {
      id: 'signature',
      naam: 'Signature',
      // ⬅️ PAS AAN — korte beschrijving (winkelpagina)
      kort: 'Havermout, noten en een hint van vanille.',
      // ⬅️ PAS AAN — langere beschrijving (productpagina)
      lang: 'Onze klassieker: krokante havermout met amandelen, pecannoten en een hint van vanille. Geroosterd in kleine batches, niet te zoet.',
      toppings: ['hennepzaad', 'beepollen', 'kokos'],
    },
    {
      id: 'apple-cinnamon',
      naam: 'Apple Cinnamon',
      kort: 'Zoete appel, kaneel en krokante clusters.', // ⬅️ PAS AAN
      lang: 'Stukjes gedroogde appel met Ceylon-kaneel en grote krokante clusters. Warm en zacht zoet — ideaal met yoghurt.', // ⬅️ PAS AAN
      toppings: ['hennepzaad', 'beepollen', 'kokos'],
    },
    {
      id: 'honey-cacao',
      naam: 'Honey Cacao',
      kort: 'Pure cacao met lokale honing.', // ⬅️ PAS AAN
      lang: 'Pure cacao en lokale honing met hazelnoten en een snuifje zeezout. Dieper van smaak, licht chocoladeachtig.', // ⬅️ PAS AAN
      toppings: ['cacaonibs', 'hennepzaad', 'kokos'],
    },
  ],

  // ---------------------------------------------------------------------------
  // 6. OPHALEN OF LEVEREN  ⬅️ PAS AAN
  // ---------------------------------------------------------------------------
  levering: [
    {
      id: 'ophalen',
      naam: 'Ophalen',
      plaats: 'Antwerpen',          // ⬅️ PAS AAN
      prijs: 0,                      // ⬅️ PAS AAN
      label: 'Ophalen in Antwerpen · gratis', // ⬅️ PAS AAN
      uitleg: 'We laten je per e-mail weten wanneer je bestelling klaarstaat.',
      adresVerplicht: false,
    },
    {
      id: 'leveren',
      naam: 'Leveren aan huis',
      prijs: 4.50,                   // ⬅️ PAS AAN
      label: 'Leveren aan huis · € 4,50', // ⬅️ PAS AAN
      uitleg: 'Levering binnen Antwerpen en omstreken.', // ⬅️ PAS AAN
      adresVerplicht: true,
    },
  ],

  // ---------------------------------------------------------------------------
  // 7. LIMIETEN
  // ---------------------------------------------------------------------------
  limieten: {
    maxAantalPerRegel: 20,  // max aantal zakjes van dezelfde samenstelling
    maxRegels: 10,          // max verschillende zakjes in één bestelling
  },
};

export default CONFIG;
