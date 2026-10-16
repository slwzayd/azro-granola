// Productpagina — smaak, maat, soort, toppings en aantal kiezen
import { CONFIG } from '../config.js';
import { berekenRegel, formatCenten, formatEur, toppingsVanSmaak } from './prijs.js';
import { voegToe, werkTellerBij } from './winkelmandje.js';

const vinkje = `<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B1B1B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>`;

// --- Toestand ---------------------------------------------------------------

const startSmaak = new URLSearchParams(location.search).get('smaak');
const keuze = {
  smaak: CONFIG.smaken.some((s) => s.id === startSmaak) ? startSmaak : CONFIG.smaken[0].id,
  maat: CONFIG.maten[CONFIG.maten.length - 1].id, // standaard de grootste, zoals in het ontwerp
  soort: CONFIG.soorten[0].id,
  toppings: [],
  aantal: 1,
};

// --- Elementen --------------------------------------------------------------

const el = {
  tabs: document.getElementById('smaaktabs'),
  naam: document.getElementById('smaak-naam'),
  beschrijving: document.getElementById('smaak-beschrijving'),
  maten: document.getElementById('maten'),
  soorten: document.getElementById('soorten'),
  toppings: document.getElementById('toppings'),
  toppingPrijs: document.getElementById('topping-prijs'),
  aantal: document.getElementById('aantal'),
  minder: document.getElementById('minder'),
  meer: document.getElementById('meer'),
  samMaat: document.getElementById('samenvatting-maat'),
  samBasis: document.getElementById('samenvatting-basis'),
  samExtra: document.getElementById('samenvatting-extra'),
  samAantal: document.getElementById('samenvatting-aantal'),
  samTotaal: document.getElementById('samenvatting-totaal'),
  toevoegen: document.getElementById('toevoegen'),
  bevestigd: document.getElementById('bevestigd'),
};

el.toppingPrijs.textContent = `+ ${formatEur(CONFIG.toppingPrijs)} per topping`;

// --- Opbouwen ---------------------------------------------------------------

function bouwTabs() {
  el.tabs.innerHTML = '';
  CONFIG.smaken.forEach((smaak) => {
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'tab';
    knop.textContent = smaak.naam;
    knop.setAttribute('aria-pressed', String(smaak.id === keuze.smaak));
    knop.addEventListener('click', () => {
      keuze.smaak = smaak.id;
      keuze.toppings = []; // toppings verschillen per smaak
      const url = new URL(location.href);
      url.searchParams.set('smaak', smaak.id);
      history.replaceState(null, '', url);
      tekenAlles();
    });
    el.tabs.appendChild(knop);
  });
}

function bouwMaten() {
  el.maten.innerHTML = '';
  CONFIG.maten.forEach((maat) => {
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'pill';
    knop.setAttribute('aria-pressed', String(maat.id === keuze.maat));
    knop.innerHTML = `<span class="pill__naam"></span><span class="pill__detail"></span>`;
    knop.querySelector('.pill__naam').textContent = maat.naam;
    knop.querySelector('.pill__detail').textContent =
      `${maat.gewichtGram} g · ${formatEur(maat.prijs)}`;
    knop.addEventListener('click', () => { keuze.maat = maat.id; tekenAlles(); });
    el.maten.appendChild(knop);
  });
}

function bouwSoorten() {
  el.soorten.innerHTML = '';
  CONFIG.soorten.forEach((soort) => {
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'pill';
    knop.setAttribute('aria-pressed', String(soort.id === keuze.soort));
    knop.innerHTML = `<span class="pill__naam"></span><span class="pill__detail"></span>`;
    knop.querySelector('.pill__naam').textContent = soort.naam;
    knop.querySelector('.pill__detail').textContent =
      soort.toeslag > 0 ? `+ ${formatEur(soort.toeslag)}` : (soort.notitie || 'inbegrepen');
    knop.addEventListener('click', () => { keuze.soort = soort.id; tekenAlles(); });
    el.soorten.appendChild(knop);
  });
}

function bouwToppings() {
  el.toppings.innerHTML = '';
  toppingsVanSmaak(keuze.smaak).forEach((topping) => {
    const aan = keuze.toppings.includes(topping.id);
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'rij';
    knop.setAttribute('aria-pressed', String(aan));
    knop.innerHTML = `
      <span class="vinkvakje">${vinkje}</span>
      <span class="rij__naam"></span>
      <span class="rij__prijs"></span>`;
    knop.querySelector('.rij__naam').textContent = topping.naam;
    knop.querySelector('.rij__prijs').textContent = `+ ${formatEur(CONFIG.toppingPrijs)}`;
    knop.addEventListener('click', () => {
      keuze.toppings = aan
        ? keuze.toppings.filter((id) => id !== topping.id)
        : [...keuze.toppings, topping.id];
      tekenAlles();
    });
    el.toppings.appendChild(knop);
  });
}

// --- Tekenen ----------------------------------------------------------------

function tekenAlles() {
  const smaak = CONFIG.smaken.find((s) => s.id === keuze.smaak);
  el.naam.textContent = smaak.naam;
  el.beschrijving.textContent = smaak.lang || smaak.kort;
  document.title = `${smaak.naam} — ${CONFIG.winkel.naam}`;

  bouwTabs();
  bouwMaten();
  bouwSoorten();
  bouwToppings();

  const berekend = berekenRegel(keuze);
  const extraCenten = berekend.soortCenten + berekend.toppingCenten;

  el.samMaat.textContent = `Zakje (${berekend.maat.naam.toLowerCase()})`;
  el.samBasis.textContent = formatCenten(berekend.basisCenten);
  el.samExtra.textContent = extraCenten > 0 ? `+ ${formatCenten(extraCenten)}` : '—';
  el.samAantal.textContent = `× ${keuze.aantal}`;
  el.samTotaal.textContent = formatCenten(berekend.regelCenten);

  el.aantal.textContent = String(keuze.aantal);
  el.minder.disabled = keuze.aantal <= 1;
  el.meer.disabled = keuze.aantal >= CONFIG.limieten.maxAantalPerRegel;
}

// --- Acties -----------------------------------------------------------------

el.minder.addEventListener('click', () => {
  keuze.aantal = Math.max(1, keuze.aantal - 1);
  tekenAlles();
});

el.meer.addEventListener('click', () => {
  keuze.aantal = Math.min(CONFIG.limieten.maxAantalPerRegel, keuze.aantal + 1);
  tekenAlles();
});

el.toevoegen.addEventListener('click', () => {
  try {
    voegToe({ ...keuze });
    werkTellerBij();
    el.bevestigd.className = 'melding melding--rustig';
    el.bevestigd.textContent =
      `Toegevoegd. Ga naar je winkelmandje of kies nog een smaak.`;
    el.bevestigd.innerHTML +=
      ` <a href="/afrekenen.html" style="font-weight:600">Naar afrekenen</a>`;
  } catch (fout) {
    el.bevestigd.className = 'melding melding--fout';
    el.bevestigd.textContent = fout.message;
  }
});

tekenAlles();
