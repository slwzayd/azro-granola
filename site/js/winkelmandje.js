// =============================================================================
//  WINKELMANDJE — bewaard in localStorage van de browser
// =============================================================================
//  Een regel bevat alleen KEUZES, nooit prijzen. Prijzen worden altijd opnieuw
//  berekend uit config.js — in de browser én op de server.
// =============================================================================

import { CONFIG } from '../config.js';

const SLEUTEL = 'azro-winkelmandje-v1';

/** Alles uit het winkelmandje lezen. Geeft altijd een array terug. */
export function lees() {
  try {
    const ruw = localStorage.getItem(SLEUTEL);
    if (!ruw) return [];
    const data = JSON.parse(ruw);
    return Array.isArray(data) ? data.filter(geldigeVorm) : [];
  } catch {
    return [];
  }
}

function geldigeVorm(r) {
  return r && typeof r.smaak === 'string' && typeof r.maat === 'string'
    && typeof r.soort === 'string' && Array.isArray(r.toppings)
    && Number.isInteger(r.aantal) && r.aantal > 0;
}

/** Winkelmandje opslaan en de teller in de header bijwerken. */
export function bewaar(regels) {
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(regels));
  } catch {
    // localStorage kan geblokkeerd zijn (privémodus) — dan werkt het mandje
    // enkel binnen deze pagina. Niet erg genoeg om de klant mee lastig te vallen.
  }
  werkTellerBij();
}

/** Winkelmandje helemaal leegmaken. */
export function leeg() {
  bewaar([]);
}

/** Een unieke sleutel per samenstelling, om identieke zakjes samen te voegen. */
function vingerafdruk(regel) {
  return [
    regel.smaak,
    regel.maat,
    regel.soort,
    [...regel.toppings].sort().join(','),
  ].join('|');
}

/**
 * Een zakje toevoegen. Bestaat exact dezelfde samenstelling al?
 * Dan tellen we het aantal op in plaats van een tweede regel te maken.
 */
export function voegToe(regel) {
  const regels = lees();
  const nieuw = {
    smaak: regel.smaak,
    maat: regel.maat,
    soort: regel.soort,
    toppings: [...regel.toppings].sort(),
    aantal: regel.aantal,
  };

  const bestaande = regels.find((r) => vingerafdruk(r) === vingerafdruk(nieuw));
  if (bestaande) {
    bestaande.aantal = Math.min(
      bestaande.aantal + nieuw.aantal,
      CONFIG.limieten.maxAantalPerRegel,
    );
  } else {
    if (regels.length >= CONFIG.limieten.maxRegels) {
      throw new Error('Je winkelmandje zit vol.');
    }
    regels.push(nieuw);
  }

  bewaar(regels);
  return regels;
}

/** Het aantal van één regel aanpassen. Op 0 zetten verwijdert de regel. */
export function zetAantal(index, aantal) {
  const regels = lees();
  if (!regels[index]) return regels;

  if (aantal < 1) {
    regels.splice(index, 1);
  } else {
    regels[index].aantal = Math.min(aantal, CONFIG.limieten.maxAantalPerRegel);
  }

  bewaar(regels);
  return regels;
}

/** Eén regel verwijderen. */
export function verwijder(index) {
  const regels = lees();
  regels.splice(index, 1);
  bewaar(regels);
  return regels;
}

/** Totaal aantal zakjes in het mandje. */
export function aantalZakjes() {
  return lees().reduce((som, r) => som + r.aantal, 0);
}

/** De teller naast het mandje-icoon in de header bijwerken. */
export function werkTellerBij() {
  const n = aantalZakjes();
  document.querySelectorAll('[data-mandje-teller]').forEach((el) => {
    el.textContent = String(n);
  });
  document.querySelectorAll('[data-mandje-link]').forEach((el) => {
    el.setAttribute('aria-label', n === 1 ? 'Winkelmandje, 1 zakje' : `Winkelmandje, ${n} zakjes`);
  });
}

// Teller meteen bijwerken zodra de pagina geladen is.
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', werkTellerBij);
  } else {
    werkTellerBij();
  }
}
