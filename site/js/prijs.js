// =============================================================================
//  PRIJSBEREKENING — gedeeld door de website én de server
// =============================================================================
//  Hier staat de enige echte prijslogica. De server (Netlify Function) gebruikt
//  precies dezelfde functies, zodat een bedrag uit de browser nooit nodig is.
//
//  Prijs per zakje = basisprijs maat + toeslag soort + (aantal toppings × 1,50)
//  Regeltotaal     = prijs per zakje × aantal
//  Bestellingstotaal = som van alle regels + leverkost
// =============================================================================

import { CONFIG } from '../config.js';

/** Centen tonen als "€ 41,00". */
export function formatCenten(c) {
  return '€ ' + (c / 100).toFixed(2).replace('.', ',');
}

/** Bedrag in euro's tonen als "€ 9,50" (Belgisch Nederlands). */
export function formatEur(bedrag) {
  return formatCenten(naarCenten(bedrag));
}

/** Euro's → hele centen, om afrondingsfouten te vermijden. */
function naarCenten(euro) {
  return Math.round(Number(euro) * 100);
}

/** Centen → euro's met 2 decimalen, als string voor Mollie ("41.00"). */
export function centenNaarMollie(c) {
  return (c / 100).toFixed(2);
}

// --- Opzoeken in de configuratie -------------------------------------------

export function vindSmaak(id) {
  return CONFIG.smaken.find((s) => s.id === id) || null;
}

export function vindMaat(id) {
  return CONFIG.maten.find((m) => m.id === id) || null;
}

export function vindSoort(id) {
  return CONFIG.soorten.find((s) => s.id === id) || null;
}

export function vindTopping(id) {
  return CONFIG.toppings.find((t) => t.id === id) || null;
}

export function vindLevering(id) {
  return CONFIG.levering.find((l) => l.id === id) || null;
}

/** De toppings die bij een smaak horen, als volledige objecten. */
export function toppingsVanSmaak(smaakId) {
  const smaak = vindSmaak(smaakId);
  if (!smaak) return [];
  return smaak.toppings.map(vindTopping).filter(Boolean);
}

/** Laagste prijs over alle maten — voor "vanaf € ..." op de winkelpagina. */
export function vanafPrijs() {
  return Math.min(...CONFIG.maten.map((m) => m.prijs));
}

// --- Eén regel (één soort zakje, met aantal) --------------------------------

/**
 * Controleert één winkelmandje-regel en rekent de prijs uit.
 * Gooit een Error met een Nederlandse melding als er iets niet klopt.
 *
 * Een regel ziet eruit als:
 *   { smaak: 'honey-cacao', maat: 'groot', soort: 'glutenvrij',
 *     toppings: ['cacaonibs','kokos'], aantal: 2 }
 */
export function berekenRegel(regel) {
  const smaak = vindSmaak(regel && regel.smaak);
  if (!smaak) throw new Error('Onbekende smaak in de bestelling.');

  const maat = vindMaat(regel.maat);
  if (!maat) throw new Error('Onbekende maat in de bestelling.');

  const soort = vindSoort(regel.soort);
  if (!soort) throw new Error('Onbekende soort in de bestelling.');

  const aantal = Number(regel.aantal);
  if (!Number.isInteger(aantal) || aantal < 1 || aantal > CONFIG.limieten.maxAantalPerRegel) {
    throw new Error('Ongeldig aantal in de bestelling.');
  }

  // Dubbels weghalen en controleren of de topping bij deze smaak hoort.
  const gekozenIds = Array.from(new Set(regel.toppings || []));
  const gekozenToppings = gekozenIds.map((id) => {
    if (!smaak.toppings.includes(id)) {
      throw new Error('Deze topping hoort niet bij de gekozen smaak.');
    }
    return vindTopping(id);
  });

  const basisCenten = naarCenten(maat.prijs);
  const soortCenten = naarCenten(soort.toeslag);
  const toppingCenten = gekozenToppings.length * naarCenten(CONFIG.toppingPrijs);

  const perZakjeCenten = basisCenten + soortCenten + toppingCenten;
  const regelCenten = perZakjeCenten * aantal;

  return {
    smaak,
    maat,
    soort,
    toppings: gekozenToppings,
    aantal,
    basisCenten,
    soortCenten,
    toppingCenten,
    perZakjeCenten,
    regelCenten,
    // Nette omschrijving, ook bruikbaar in e-mails:
    omschrijving: `${aantal}× ${smaak.naam} · ${maat.naam}`,
    detail: [soort.naam, ...gekozenToppings.map((t) => t.naam)].join(' · '),
  };
}

// --- Hele bestelling --------------------------------------------------------

/**
 * Rekent de volledige bestelling uit vanuit de configuratie.
 * `regels` = array winkelmandje-regels, `leveringId` = 'ophalen' of 'leveren'.
 */
export function berekenBestelling(regels, leveringId) {
  if (!Array.isArray(regels) || regels.length === 0) {
    throw new Error('Je winkelmandje is leeg.');
  }
  if (regels.length > CONFIG.limieten.maxRegels) {
    throw new Error('Te veel verschillende zakjes in één bestelling.');
  }

  const levering = vindLevering(leveringId);
  if (!levering) throw new Error('Kies ophalen of leveren.');

  const berekend = regels.map(berekenRegel);
  const subtotaalCenten = berekend.reduce((som, r) => som + r.regelCenten, 0);
  const leverCenten = naarCenten(levering.prijs);
  const totaalCenten = subtotaalCenten + leverCenten;

  return {
    regels: berekend,
    levering,
    subtotaalCenten,
    leverCenten,
    totaalCenten,
    aantalZakjes: berekend.reduce((som, r) => som + r.aantal, 0),
  };
}
