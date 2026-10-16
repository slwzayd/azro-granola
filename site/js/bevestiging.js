// Bevestigingspagina — haalt de echte betaalstatus op bij de server
import { CONFIG } from '../config.js';
import { leeg } from './winkelmandje.js';

const el = (id) => document.getElementById(id);

const vinkjeIcoon = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>`;
const kruisIcoon = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>`;
const klokIcoon = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v6l4 2"></path><circle cx="12" cy="12" r="9"></circle></svg>`;

const betaalId = new URLSearchParams(location.search).get('id');

function knop(tekst, href, soort) {
  const a = document.createElement('a');
  a.className = `knop ${soort}`;
  a.href = href;
  a.textContent = tekst;
  return a;
}

function toonDetails(regels) {
  const paneel = el('details');
  paneel.innerHTML = '';
  regels.forEach(([links, rechts]) => {
    const rij = document.createElement('div');
    rij.className = 'regel';
    const l = document.createElement('span');
    l.className = 'zacht';
    l.textContent = links;
    const r = document.createElement('span');
    r.style.fontWeight = '600';
    r.textContent = rechts;
    rij.append(l, r);
    paneel.appendChild(rij);
  });
  paneel.hidden = regels.length === 0;
}

function toonGelukt(data) {
  document.title = 'Bestelling bevestigd — Azro granola';
  el('merkteken').className = 'merkteken';
  el('merkteken').innerHTML = vinkjeIcoon;
  el('titel').textContent = 'Bedankt! Je granola komt eraan.';
  el('uitleg').textContent =
    'Je betaling is gelukt. We sturen een bevestiging naar je e-mail en laten je weten wanneer je bestelling klaarstaat.';

  const regels = [['Bestelnummer', data.bestelnummer || '—']];
  if (data.leveringNaam) regels.push([data.leveringNaam, data.leveringDetail || '—']);
  if (data.bedrag) regels.push(['Betaald', data.bedrag]);
  toonDetails(regels);

  el('knoppen').append(
    knop(`Volg @${CONFIG.winkel.instagram}`, `https://instagram.com/${CONFIG.winkel.instagram}`, 'knop--zwart'),
    knop('Terug naar de winkel', '/', 'knop--tekst'),
  );

  // De bestelling is betaald — het winkelmandje mag leeg.
  leeg();
}

function toonMislukt(titel, uitleg) {
  document.title = 'Betaling niet gelukt — Azro granola';
  el('merkteken').className = 'merkteken merkteken--fout';
  el('merkteken').innerHTML = kruisIcoon;
  el('titel').textContent = titel;
  el('uitleg').textContent = uitleg;
  toonDetails([]);

  // Winkelmandje blijft staan, zodat opnieuw proberen meteen lukt.
  el('knoppen').append(
    knop('Opnieuw proberen', '/afrekenen.html', 'knop--hoofd'),
    knop('Terug naar de winkel', '/', 'knop--tekst'),
  );
}

function toonOpen(data) {
  el('merkteken').className = 'merkteken merkteken--wachten';
  el('merkteken').innerHTML = klokIcoon;
  el('titel').textContent = 'Je betaling wordt verwerkt';
  el('uitleg').textContent =
    'Dit duurt meestal maar enkele seconden. Deze pagina ververst zichzelf.';
  toonDetails(data && data.bestelnummer ? [['Bestelnummer', data.bestelnummer]] : []);

  // Nog even opnieuw kijken
  setTimeout(haalStatusOp, 3000);
}

let pogingen = 0;

async function haalStatusOp() {
  pogingen += 1;

  try {
    const antwoord = await fetch(
      `/.netlify/functions/bestelling?id=${encodeURIComponent(betaalId)}`,
    );
    const data = await antwoord.json();

    if (!antwoord.ok) throw new Error(data.fout || 'Onbekende fout');

    el('knoppen').innerHTML = '';

    if (data.status === 'paid') {
      toonGelukt(data);
    } else if (data.status === 'open' || data.status === 'pending' || data.status === 'authorized') {
      if (pogingen > 10) {
        toonMislukt(
          'Je betaling duurt langer dan verwacht',
          'We hebben nog geen bevestiging ontvangen. Krijg je toch een betaalbevestiging van je bank? Dan komt je bestelling gewoon binnen. Anders kan je het opnieuw proberen.',
        );
      } else {
        toonOpen(data);
      }
    } else if (data.status === 'canceled') {
      toonMislukt(
        'Betaling geannuleerd',
        'Je hebt de betaling afgebroken. Je winkelmandje staat nog klaar — je kan het zo opnieuw proberen.',
      );
    } else if (data.status === 'expired') {
      toonMislukt(
        'Betaling verlopen',
        'De betaling is verlopen omdat ze te lang openstond. Je winkelmandje staat nog klaar.',
      );
    } else {
      toonMislukt(
        'Betaling niet gelukt',
        'De betaling is niet doorgegaan. Er is niets aangerekend. Je winkelmandje staat nog klaar — probeer het gerust opnieuw.',
      );
    }
  } catch (fout) {
    el('knoppen').innerHTML = '';
    toonMislukt(
      'We konden je betaling niet nakijken',
      `Er ging iets mis bij het ophalen van de status (${fout.message}). Check je e-mail voor een bevestiging, of neem contact op via ${CONFIG.winkel.contactEmail}.`,
    );
  }
}

if (!betaalId) {
  el('knoppen').innerHTML = '';
  toonMislukt(
    'Geen bestelling gevonden',
    'We konden deze pagina niet aan een betaling koppelen. Ga terug naar de winkel om opnieuw te beginnen.',
  );
} else {
  haalStatusOp();
}
