// Afrekenpagina — overzicht, levering, gegevens, betaalmethode
import { CONFIG } from '../config.js';
import { berekenBestelling, formatCenten } from './prijs.js';
import { lees, zetAantal, verwijder, werkTellerBij } from './winkelmandje.js';

const el = (id) => document.getElementById(id);

const formulier = el('afrekenen');
const leegBlok = el('leeg-mandje');
const ladenBlok = el('laden');

let keuze = {
  levering: CONFIG.levering[0].id,
  betaalmethode: 'kaart', // 'kaart' of 'applepay'
};

// --- Apple Pay alleen tonen als het toestel het ondersteunt ------------------

function applePayBeschikbaar() {
  try {
    return typeof window.ApplePaySession !== 'undefined'
      && window.ApplePaySession.canMakePayments();
  } catch {
    return false;
  }
}

const toonApplePay = applePayBeschikbaar();
if (toonApplePay) keuze.betaalmethode = 'applepay';

// --- Overzicht van het winkelmandje -----------------------------------------

function tekenOverzicht() {
  const regels = lees();

  if (regels.length === 0) {
    ladenBlok.hidden = true;
    formulier.hidden = true;
    leegBlok.hidden = false;
    return null;
  }

  ladenBlok.hidden = true;
  leegBlok.hidden = true;
  formulier.hidden = false;

  let bestelling;
  try {
    bestelling = berekenBestelling(regels, keuze.levering);
  } catch (fout) {
    el('overzicht').innerHTML = '';
    const melding = document.createElement('p');
    melding.className = 'melding melding--fout';
    melding.textContent = `${fout.message} Maak je winkelmandje leeg en probeer opnieuw.`;
    el('overzicht').appendChild(melding);
    return null;
  }

  const paneel = el('overzicht');
  paneel.innerHTML = '';

  bestelling.regels.forEach((regel, index) => {
    const blok = document.createElement('div');
    blok.className = 'mandje-regel';

    const hoofd = document.createElement('div');
    hoofd.className = 'regel';
    const titel = document.createElement('span');
    titel.textContent = regel.omschrijving;
    const bedrag = document.createElement('span');
    bedrag.className = 'regel__bedrag';
    bedrag.textContent = formatCenten(regel.regelCenten);
    hoofd.append(titel, bedrag);
    blok.appendChild(hoofd);

    // Detailregel: soort en toppings, met de meerprijs per zakje
    const extraCenten = regel.soortCenten + regel.toppingCenten;
    if (regel.detail) {
      const detail = document.createElement('div');
      detail.className = 'regel regel--klein';
      const links = document.createElement('span');
      links.textContent = regel.detail;
      const rechts = document.createElement('span');
      rechts.textContent = extraCenten > 0
        ? `+ ${formatCenten(extraCenten)} per zakje`
        : '';
      detail.append(links, rechts);
      blok.appendChild(detail);
    }

    // Aantal aanpassen en verwijderen
    const acties = document.createElement('div');
    acties.className = 'mandje-regel__acties';

    const minder = document.createElement('button');
    minder.type = 'button';
    minder.className = 'knop-mini';
    minder.textContent = '−';
    minder.setAttribute('aria-label', `Eén ${regel.smaak.naam} minder`);
    minder.disabled = regel.aantal <= 1;
    minder.addEventListener('click', () => {
      zetAantal(index, regel.aantal - 1);
      tekenOverzicht();
    });

    const waarde = document.createElement('span');
    waarde.textContent = String(regel.aantal);
    waarde.style.minWidth = '18px';
    waarde.style.textAlign = 'center';

    const meer = document.createElement('button');
    meer.type = 'button';
    meer.className = 'knop-mini';
    meer.textContent = '+';
    meer.setAttribute('aria-label', `Eén ${regel.smaak.naam} meer`);
    meer.disabled = regel.aantal >= CONFIG.limieten.maxAantalPerRegel;
    meer.addEventListener('click', () => {
      zetAantal(index, regel.aantal + 1);
      tekenOverzicht();
    });

    const weg = document.createElement('button');
    weg.type = 'button';
    weg.className = 'knop-verwijder';
    weg.textContent = 'Verwijderen';
    weg.setAttribute('aria-label', `${regel.smaak.naam} ${regel.maat.naam} verwijderen`);
    weg.addEventListener('click', () => {
      verwijder(index);
      tekenOverzicht();
    });

    acties.append(minder, waarde, meer, weg);
    blok.appendChild(acties);
    paneel.appendChild(blok);
  });

  // Leveringsregel
  const lev = document.createElement('div');
  lev.className = 'regel regel--klein';
  const levLinks = document.createElement('span');
  levLinks.textContent = bestelling.levering.naam;
  const levRechts = document.createElement('span');
  levRechts.textContent = bestelling.leverCenten > 0
    ? formatCenten(bestelling.leverCenten)
    : 'gratis';
  lev.append(levLinks, levRechts);
  paneel.appendChild(lev);

  const streep = document.createElement('hr');
  streep.className = 'scheiding';
  paneel.appendChild(streep);

  const totaal = document.createElement('div');
  totaal.className = 'regel regel--totaal';
  const totLinks = document.createElement('span');
  totLinks.textContent = 'Totaal';
  const totRechts = document.createElement('span');
  totRechts.textContent = formatCenten(bestelling.totaalCenten);
  totaal.append(totLinks, totRechts);
  paneel.appendChild(totaal);

  werkTellerBij();
  werkBetaalknopBij(bestelling);
  return bestelling;
}

// --- Levering ---------------------------------------------------------------

function tekenLevering() {
  const houder = el('levering');
  houder.innerHTML = '';

  CONFIG.levering.forEach((optie) => {
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'optie';
    knop.setAttribute('aria-pressed', String(optie.id === keuze.levering));
    const bol = document.createElement('span');
    bol.className = 'bolletje';
    const label = document.createElement('span');
    label.textContent = optie.label;
    knop.append(bol, label);
    knop.addEventListener('click', () => {
      keuze.levering = optie.id;
      tekenLevering();
      tekenAdresUitleg();
      tekenOverzicht();
    });
    houder.appendChild(knop);
  });

  const gekozen = CONFIG.levering.find((l) => l.id === keuze.levering);
  el('levering-uitleg').textContent = gekozen && gekozen.uitleg ? gekozen.uitleg : '';
}

function tekenAdresUitleg() {
  const gekozen = CONFIG.levering.find((l) => l.id === keuze.levering);
  el('adres-uitleg').textContent = gekozen && gekozen.adresVerplicht
    ? 'Waar mogen we je bestelling leveren?'
    : 'We vragen je adres ook bij ophalen, voor je factuur en als we je moeten bereiken.';
}

// --- Betaalmethode ----------------------------------------------------------

function tekenBetaalmethodes() {
  const houder = el('betaalmethodes');
  houder.innerHTML = '';

  const methodes = [];
  if (toonApplePay) {
    methodes.push({ id: 'applepay', naam: 'Apple Pay', bij: '' });
  }
  methodes.push({
    id: 'kaart',
    naam: 'Bankkaart',
    bij: '· Bancontact, Visa, Mastercard',
  });

  methodes.forEach((methode) => {
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'optie';
    knop.setAttribute('aria-pressed', String(methode.id === keuze.betaalmethode));
    const bol = document.createElement('span');
    bol.className = 'bolletje';
    const naam = document.createElement('span');
    naam.textContent = methode.naam;
    knop.append(bol, naam);
    if (methode.bij) {
      const bij = document.createElement('span');
      bij.className = 'optie__bijschrift';
      bij.textContent = methode.bij;
      knop.appendChild(bij);
    }
    knop.addEventListener('click', () => {
      keuze.betaalmethode = methode.id;
      tekenBetaalmethodes();
      tekenOverzicht();
    });
    houder.appendChild(knop);
  });
}

function werkBetaalknopBij(bestelling) {
  const knop = el('betaalknop');
  if (keuze.betaalmethode === 'applepay') {
    knop.className = 'knop knop--applepay';
    knop.textContent = 'Betalen met Apple Pay';
  } else {
    knop.className = 'knop knop--hoofd';
    knop.textContent = `Betaal ${formatCenten(bestelling.totaalCenten)}`;
  }
}

// --- Validatie --------------------------------------------------------------

const VERPLICHT = [
  { id: 'naam', label: 'Vul je naam in.' },
  { id: 'email', label: 'Vul je e-mailadres in.' },
  { id: 'straat', label: 'Vul je straat in.' },
  { id: 'nummer', label: 'Vul je huisnummer in.' },
  { id: 'postcode', label: 'Vul je postcode in.' },
  { id: 'gemeente', label: 'Vul je gemeente in.' },
];

function zetFout(id, bericht) {
  const veld = el(id);
  const foutveld = el(`fout-${id}`);
  if (bericht) {
    veld.setAttribute('aria-invalid', 'true');
    if (foutveld) foutveld.textContent = bericht;
  } else {
    veld.removeAttribute('aria-invalid');
    if (foutveld) foutveld.textContent = '';
  }
}

function valideer() {
  let eersteFout = null;

  VERPLICHT.forEach(({ id, label }) => {
    const waarde = el(id).value.trim();
    if (!waarde) {
      zetFout(id, label);
      if (!eersteFout) eersteFout = id;
    } else {
      zetFout(id, '');
    }
  });

  // E-mail iets strenger controleren
  const email = el('email').value.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
    zetFout('email', 'Dit e-mailadres lijkt niet te kloppen.');
    if (!eersteFout) eersteFout = 'email';
  }

  // Belgische postcode: 4 cijfers
  const postcode = el('postcode').value.trim();
  if (postcode && !/^\d{4}$/.test(postcode)) {
    zetFout('postcode', 'Een Belgische postcode bestaat uit 4 cijfers.');
    if (!eersteFout) eersteFout = 'postcode';
  }

  if (eersteFout) {
    const veld = el(eersteFout);
    veld.focus();
    veld.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }
  return true;
}

// Fout weghalen zodra iemand het veld corrigeert
VERPLICHT.forEach(({ id }) => {
  el(id).addEventListener('input', () => {
    if (el(id).getAttribute('aria-invalid') === 'true' && el(id).value.trim()) {
      zetFout(id, '');
    }
  });
});

// --- Versturen --------------------------------------------------------------

formulier.addEventListener('submit', async (gebeurtenis) => {
  gebeurtenis.preventDefault();

  const foutmelding = el('formulier-fout');
  foutmelding.textContent = '';

  if (!valideer()) {
    foutmelding.textContent = 'Vul de ontbrekende gegevens aan om verder te gaan.';
    return;
  }

  const regels = lees();
  if (regels.length === 0) {
    tekenOverzicht();
    return;
  }

  const knop = el('betaalknop');
  const oudeTekst = knop.textContent;
  knop.disabled = true;
  knop.textContent = 'Betaling voorbereiden…';

  const bestelling = {
    // Alleen keuzes — nooit bedragen. De server rekent alles opnieuw uit.
    regels: regels.map((r) => ({
      smaak: r.smaak,
      maat: r.maat,
      soort: r.soort,
      toppings: r.toppings,
      aantal: r.aantal,
    })),
    levering: keuze.levering,
    betaalmethode: keuze.betaalmethode,
    klant: {
      naam: el('naam').value.trim(),
      email: el('email').value.trim(),
      instagram: el('instagram').value.trim(),
      straat: el('straat').value.trim(),
      nummer: el('nummer').value.trim(),
      postcode: el('postcode').value.trim(),
      gemeente: el('gemeente').value.trim(),
      telefoon: el('telefoon').value.trim(),
    },
  };

  try {
    const antwoord = await fetch('/.netlify/functions/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bestelling),
    });

    const data = await antwoord.json().catch(() => ({}));

    if (!antwoord.ok || !data.checkoutUrl) {
      throw new Error(data.fout || 'We konden de betaling niet starten. Probeer het opnieuw.');
    }

    // Winkelmandje pas wissen na een geslaagde betaling (op de bevestigingspagina),
    // zodat de klant niets kwijt is als hij de betaling annuleert.
    window.location.href = data.checkoutUrl;
  } catch (fout) {
    knop.disabled = false;
    knop.textContent = oudeTekst;
    foutmelding.textContent = fout.message;
    foutmelding.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

// --- Opstarten --------------------------------------------------------------

tekenLevering();
tekenAdresUitleg();
tekenBetaalmethodes();
tekenOverzicht();
