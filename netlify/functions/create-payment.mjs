// =============================================================================
//  create-payment — maakt een Mollie-betaling aan
// =============================================================================
//  De browser stuurt ALLEEN keuzes door (smaak, maat, soort, toppings, aantal)
//  en de klantgegevens. Het bedrag wordt hier volledig opnieuw berekend uit
//  site/config.js. Een bedrag uit de browser wordt nooit gebruikt.
// =============================================================================

import { berekenBestelling, formatCenten } from '../../site/js/prijs.js';
import {
  json, foutAntwoord, maakBetaling, basisUrl, isLokaal,
  maakBestelnummer, schoon,
} from '../lib/gedeeld.mjs';

export default async function handler(request) {
  if (request.method !== 'POST') {
    return foutAntwoord('Methode niet toegestaan.', 405);
  }

  // --- 1. Verzoek inlezen ---------------------------------------------------

  let verzoek;
  try {
    verzoek = await request.json();
  } catch {
    return foutAntwoord('We konden je bestelling niet lezen.', 400);
  }

  // --- 2. Totaal opnieuw berekenen op de server -----------------------------

  let bestelling;
  try {
    bestelling = berekenBestelling(verzoek.regels, verzoek.levering);
  } catch (fout) {
    return foutAntwoord(fout.message, 400);
  }

  if (bestelling.totaalCenten < 1) {
    return foutAntwoord('Het bedrag van deze bestelling klopt niet.', 400);
  }

  // --- 3. Klantgegevens controleren -----------------------------------------

  const k = verzoek.klant || {};
  const klant = {
    naam: schoon(k.naam, 100),
    email: schoon(k.email, 120).toLowerCase(),
    instagram: schoon(k.instagram, 40),
    straat: schoon(k.straat, 100),
    nummer: schoon(k.nummer, 20),
    postcode: schoon(k.postcode, 10),
    gemeente: schoon(k.gemeente, 60),
    telefoon: schoon(k.telefoon, 30),
  };

  const ontbreekt = ['naam', 'email', 'straat', 'nummer', 'postcode', 'gemeente']
    .filter((veld) => !klant[veld]);

  if (ontbreekt.length > 0) {
    return foutAntwoord('Niet alle verplichte gegevens zijn ingevuld.', 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(klant.email)) {
    return foutAntwoord('Dit e-mailadres lijkt niet te kloppen.', 400);
  }

  // --- 4. Betaalmethode -----------------------------------------------------

  // Apple Pay apart; anders laat Mollie Bancontact en kaart kiezen.
  const method = verzoek.betaalmethode === 'applepay'
    ? 'applepay'
    : ['bancontact', 'creditcard'];

  // --- 5. Bestelling meegeven aan Mollie (metadata, max 1 kB) ---------------

  const bestelnummer = maakBestelnummer();

  const metadata = {
    nr: bestelnummer,
    lev: bestelling.levering.id,
    regels: bestelling.regels.map((r) => ({
      s: r.smaak.id,
      m: r.maat.id,
      t: r.soort.id,
      x: r.toppings.map((t) => t.id),
      a: r.aantal,
    })),
    klant,
  };

  if (JSON.stringify(metadata).length > 1000) {
    return foutAntwoord(
      'Deze bestelling is te groot om in één keer af te rekenen. '
      + 'Plaats ze in twee kleinere bestellingen of neem contact op.',
      400,
    );
  }

  // --- 6. Betaling aanmaken bij Mollie --------------------------------------

  const basis = basisUrl(request);
  const lokaal = isLokaal(basis);

  const payload = {
    amount: {
      currency: 'EUR',
      value: (bestelling.totaalCenten / 100).toFixed(2),
    },
    description: `Azro granola · bestelling ${bestelnummer}`,
    redirectUrl: `${basis}/bevestiging.html?id={paymentId}`,
    cancelUrl: `${basis}/bevestiging.html?id={paymentId}`,
    locale: 'nl_BE',
    method,
    metadata,
  };

  // Mollie kan een localhost-webhook niet bereiken. Bij `netlify dev` laten we
  // hem dus weg — de bevestigingspagina haalt de status rechtstreeks op.
  if (!lokaal) {
    payload.webhookUrl = `${basis}/.netlify/functions/mollie-webhook`;
  }

  try {
    const betaling = await maakBetaling(payload);
    const checkoutUrl = betaling?._links?.checkout?.href;

    if (!checkoutUrl) {
      throw new Error('Mollie gaf geen betaallink terug.');
    }

    console.log(
      `Betaling aangemaakt: ${betaling.id} · ${bestelnummer} · `
      + `${formatCenten(bestelling.totaalCenten)}${lokaal ? ' (lokaal, zonder webhook)' : ''}`,
    );

    return json({
      checkoutUrl,
      betaalId: betaling.id,
      bestelnummer,
    });
  } catch (fout) {
    console.error('Betaling aanmaken mislukt:', fout.message);
    return foutAntwoord(
      'We konden de betaling niet starten. Probeer het zo meteen opnieuw.',
      502,
    );
  }
}
