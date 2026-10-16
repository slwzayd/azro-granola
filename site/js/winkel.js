// Winkelpagina — lijst met smaken, opgebouwd uit config.js
import { CONFIG } from '../config.js';
import { formatEur, vanafPrijs } from './prijs.js';
import './winkelmandje.js';

const pijl = `<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>`;

function tekst(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const lijst = document.getElementById('smaken');
lijst.innerHTML = CONFIG.smaken.map((smaak) => `
  <a class="kaart-link" href="/product.html?smaak=${encodeURIComponent(smaak.id)}">
    <span class="kaart-link__tekst">
      <span class="kaart-link__naam">${tekst(smaak.naam)}</span>
      <span class="kaart-link__beschrijving">${tekst(smaak.kort)}</span>
      <span class="kaart-link__prijs">vanaf ${formatEur(vanafPrijs())}</span>
    </span>
    ${pijl}
  </a>
`).join('');

// "Zo werkt het" — de ophaalplaats komt uit de configuratie
const ophalen = CONFIG.levering.find((l) => l.id === 'ophalen');
const regio = ophalen && ophalen.plaats ? ophalen.plaats : 'je buurt';
document.getElementById('zo-werkt-het').innerHTML = `
  1. Kies smaak, maat en toppings<br>
  2. Betaal met bankkaart of Apple Pay<br>
  3. Ophalen of laten leveren in ${tekst(regio)}
`;

// Footer
const ig = document.getElementById('ig-link');
ig.href = `https://instagram.com/${CONFIG.winkel.instagram}`;
ig.textContent = `@${CONFIG.winkel.instagram}`;

const mail = document.getElementById('mail-link');
mail.href = `mailto:${CONFIG.winkel.contactEmail}`;
mail.textContent = CONFIG.winkel.contactEmail;

document.title = `${CONFIG.winkel.naam} — verse granola bestellen`;
