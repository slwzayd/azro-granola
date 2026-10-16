// =============================================================================
//  PRIJSTEST — controleert of de prijsberekening klopt
//  Uitvoeren met:  node test/prijzen.test.mjs
// =============================================================================

import { berekenBestelling, berekenRegel, formatCenten } from '../site/js/prijs.js';
import { CONFIG } from '../site/config.js';

let gelukt = 0;
let mislukt = 0;

function controleer(omschrijving, gekregen, verwacht) {
  const ok = gekregen === verwacht;
  if (ok) {
    gelukt += 1;
    console.log(`  ✓ ${omschrijving}`);
  } else {
    mislukt += 1;
    console.log(`  ✗ ${omschrijving}\n      verwacht: ${verwacht}\n      gekregen: ${gekregen}`);
  }
}

function kop(tekst) {
  console.log(`\n${tekst}`);
}

// --- Huidige prijzen tonen ---------------------------------------------------

console.log('Prijzen uit site/config.js:');
CONFIG.maten.forEach((m) => {
  console.log(`  ${m.naam.padEnd(8)} ${String(m.gewichtGram).padStart(4)} g   ${formatCenten(m.prijs * 100)}`);
});
console.log(`  Glutenvrij        + ${formatCenten(CONFIG.soorten[1].toeslag * 100)}`);
console.log(`  Topping           + ${formatCenten(CONFIG.toppingPrijs * 100)} per stuk`);
CONFIG.levering.forEach((l) => {
  console.log(`  ${l.naam.padEnd(18)}${l.prijs > 0 ? formatCenten(l.prijs * 100) : 'gratis'}`);
});

// --- Voorbeeld 1 -------------------------------------------------------------

kop('Voorbeeld 1 — Honey Cacao, groot, glutenvrij, 2 toppings, aantal 2');

const v1 = berekenRegel({
  smaak: 'honey-cacao',
  maat: 'groot',
  soort: 'glutenvrij',
  toppings: ['cacaonibs', 'kokos'],
  aantal: 2,
});

console.log(
  `  basis ${formatCenten(v1.basisCenten)}`
  + ` + glutenvrij ${formatCenten(v1.soortCenten)}`
  + ` + 2 toppings ${formatCenten(v1.toppingCenten)}`
  + ` = ${formatCenten(v1.perZakjeCenten)} per zakje × 2`,
);

controleer('prijs per zakje', formatCenten(v1.perZakjeCenten), '€ 20,50');
controleer('regeltotaal', formatCenten(v1.regelCenten), '€ 41,00');

// --- Voorbeeld 2 -------------------------------------------------------------

kop('Voorbeeld 2 — Signature, medium, normaal, geen toppings, aantal 1');

const v2 = berekenRegel({
  smaak: 'signature',
  maat: 'medium',
  soort: 'normaal',
  toppings: [],
  aantal: 1,
});

controleer('regeltotaal', formatCenten(v2.regelCenten), '€ 9,50');

// --- Voorbeeld 3: volledige bestelling met levering --------------------------

kop('Voorbeeld 3 — winkelmandje met 2 verschillende zakjes + levering');

const v3 = berekenBestelling(
  [
    { smaak: 'apple-cinnamon', maat: 'groot', soort: 'glutenvrij', toppings: ['hennepzaad', 'kokos'], aantal: 1 },
    { smaak: 'honey-cacao', maat: 'medium', soort: 'normaal', toppings: ['cacaonibs'], aantal: 1 },
  ],
  'leveren',
);

v3.regels.forEach((r) => {
  console.log(`  ${r.omschrijving} (${r.detail}) = ${formatCenten(r.regelCenten)}`);
});
console.log(`  Levering = ${formatCenten(v3.leverCenten)}`);
console.log(`  TOTAAL = ${formatCenten(v3.totaalCenten)}`);

// 16,50 + 1,00 + 3,00 = 20,50  |  9,50 + 1,50 = 11,00  |  levering 4,50
controleer('regel 1', formatCenten(v3.regels[0].regelCenten), '€ 20,50');
controleer('regel 2', formatCenten(v3.regels[1].regelCenten), '€ 11,00');
controleer('subtotaal', formatCenten(v3.subtotaalCenten), '€ 31,50');
controleer('totaal met levering', formatCenten(v3.totaalCenten), '€ 36,00');

// --- Voorbeeld 4: ophalen is gratis ------------------------------------------

kop('Voorbeeld 4 — zelfde mandje, maar ophalen');

const v4 = berekenBestelling(
  [
    { smaak: 'apple-cinnamon', maat: 'groot', soort: 'glutenvrij', toppings: ['hennepzaad', 'kokos'], aantal: 1 },
    { smaak: 'honey-cacao', maat: 'medium', soort: 'normaal', toppings: ['cacaonibs'], aantal: 1 },
  ],
  'ophalen',
);

controleer('leverkost', formatCenten(v4.leverCenten), '€ 0,00');
controleer('totaal', formatCenten(v4.totaalCenten), '€ 31,50');

// --- Voorbeeld 5: afronding --------------------------------------------------

kop('Voorbeeld 5 — afronding bij 3 toppings × 7 zakjes');

const v5 = berekenRegel({
  smaak: 'signature',
  maat: 'medium',
  soort: 'glutenvrij',
  toppings: ['hennepzaad', 'beepollen', 'kokos'],
  aantal: 7,
});

// (9,50 + 1,00 + 4,50) × 7 = 15,00 × 7 = 105,00
controleer('per zakje', formatCenten(v5.perZakjeCenten), '€ 15,00');
controleer('regeltotaal', formatCenten(v5.regelCenten), '€ 105,00');

// --- Beveiliging: ongeldige invoer moet geweigerd worden ---------------------

kop('Beveiliging — ongeldige bestellingen worden geweigerd');

function moetFalen(omschrijving, functie) {
  try {
    functie();
    mislukt += 1;
    console.log(`  ✗ ${omschrijving} — werd TEN ONRECHTE aanvaard`);
  } catch (fout) {
    gelukt += 1;
    console.log(`  ✓ ${omschrijving} — geweigerd: "${fout.message}"`);
  }
}

moetFalen('topping die niet bij de smaak hoort', () => berekenRegel({
  smaak: 'signature', maat: 'groot', soort: 'normaal', toppings: ['cacaonibs'], aantal: 1,
}));

moetFalen('onbekende smaak', () => berekenRegel({
  smaak: 'gratis-granola', maat: 'groot', soort: 'normaal', toppings: [], aantal: 1,
}));

moetFalen('negatief aantal', () => berekenRegel({
  smaak: 'signature', maat: 'groot', soort: 'normaal', toppings: [], aantal: -5,
}));

moetFalen('leeg winkelmandje', () => berekenBestelling([], 'ophalen'));

moetFalen('onbekende leveringswijze', () => berekenBestelling(
  [{ smaak: 'signature', maat: 'groot', soort: 'normaal', toppings: [], aantal: 1 }],
  'teleportatie',
));

// Dubbele toppings mogen maar één keer aangerekend worden
kop('Beveiliging — dubbele topping telt maar één keer');
const v6 = berekenRegel({
  smaak: 'signature', maat: 'medium', soort: 'normaal',
  toppings: ['kokos', 'kokos', 'kokos'], aantal: 1,
});
controleer('één topping aangerekend', formatCenten(v6.regelCenten), '€ 11,00');

// --- Uitslag -----------------------------------------------------------------

console.log(`\n${'─'.repeat(50)}`);
console.log(`${gelukt} geslaagd, ${mislukt} mislukt`);
process.exit(mislukt === 0 ? 0 : 1);
