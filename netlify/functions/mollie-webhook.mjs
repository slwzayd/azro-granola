// =============================================================================
//  mollie-webhook — Mollie meldt hier elke statuswijziging van een betaling
// =============================================================================
//  Mollie stuurt alleen een betaal-id mee, nooit een bedrag of een status.
//  We halen de betaling dus altijd zelf op bij Mollie. Bij status "paid"
//  sturen we twee e-mails: één naar de eigenaar, één naar de klant.
//
//  Belangrijk: deze functie antwoordt bijna altijd met 200. Zo stopt Mollie met
//  opnieuw proberen. Antwoorden we met een fout, dan blijft Mollie de webhook
//  herhalen — en zou de eigenaar dezelfde bestelling meermaals binnenkrijgen.
// =============================================================================

import { berekenBestelling } from '../../site/js/prijs.js';
import { mailNaarEigenaar, mailNaarKlant } from '../lib/emails.mjs';
import { haalBetalingOp, stuurEmail, isTestmodus } from '../lib/gedeeld.mjs';

/** Antwoord dat Mollie als "verwerkt" beschouwt. */
function ok(bericht = 'ok') {
  return new Response(bericht, { status: 200 });
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Methode niet toegestaan', { status: 405 });
  }

  // --- 1. Betaal-id uit het verzoek halen -----------------------------------

  let betaalId = null;
  try {
    const formulier = await request.formData();
    betaalId = formulier.get('id');
  } catch {
    // Sommige omgevingen sturen het als JSON door.
    try {
      const data = await request.clone().json();
      betaalId = data && data.id;
    } catch { /* genegeerd */ }
  }

  if (!betaalId || typeof betaalId !== 'string') {
    console.error('Webhook zonder geldig betaal-id ontvangen.');
    return ok('geen id');
  }

  // --- 2. Betaling ophalen bij Mollie ---------------------------------------

  let betaling;
  try {
    betaling = await haalBetalingOp(betaalId);
  } catch (fout) {
    console.error('Betaling ophalen mislukt:', fout.message);
    // Hier wél een fout: Mollie mag het later opnieuw proberen, want we weten
    // nog niets over deze betaling en hebben dus ook nog niets verstuurd.
    return new Response('kon betaling niet ophalen', { status: 503 });
  }

  console.log(`Webhook: ${betaling.id} heeft status "${betaling.status}".`);

  if (betaling.status !== 'paid') {
    // Geannuleerd, verlopen of mislukt: niets te doen.
    return ok(`status ${betaling.status}`);
  }

  // --- 3. Bestelling opnieuw opbouwen uit de metadata -----------------------

  const metadata = betaling.metadata || {};
  const klant = metadata.klant || {};
  const bestelnummer = metadata.nr || betaling.id;

  let bestelling;
  try {
    const regels = (metadata.regels || []).map((r) => ({
      smaak: r.s,
      maat: r.m,
      soort: r.t,
      toppings: r.x || [],
      aantal: r.a,
    }));
    bestelling = berekenBestelling(regels, metadata.lev);
  } catch (fout) {
    console.error(
      `Bestelling ${bestelnummer} kon niet herberekend worden: ${fout.message}. `
      + 'Bekijk de betaling in het Mollie-dashboard.',
    );
    // Toch de eigenaar verwittigen — met wat we wél weten.
    await stuurEmail({
      naar: process.env.EIGENAAR_EMAIL,
      onderwerp: `Betaling binnengekomen (${bestelnummer}) — bestelling handmatig nakijken`,
      tekst:
        `Er is een betaling van ${betaling.amount.value} ${betaling.amount.currency} binnengekomen, `
        + `maar de bestelling kon niet automatisch uitgelezen worden (${fout.message}).\n\n`
        + `Mollie-betaling: ${betaling.id}\n`
        + `Ruwe gegevens:\n${JSON.stringify(metadata, null, 2)}`,
      html: `<p>Er is een betaling van <strong>${betaling.amount.value} ${betaling.amount.currency}</strong> `
        + `binnengekomen, maar de bestelling kon niet automatisch uitgelezen worden.</p>`
        + `<p>Mollie-betaling: <code>${betaling.id}</code></p>`
        + `<pre>${JSON.stringify(metadata, null, 2)}</pre>`,
    });
    return ok('metadata onleesbaar');
  }

  // --- 4. Controle: komt het betaalde bedrag overeen? -----------------------

  const betaaldCenten = Math.round(Number(betaling.amount.value) * 100);
  if (betaaldCenten !== bestelling.totaalCenten) {
    console.error(
      `Bedrag wijkt af voor ${bestelnummer}: betaald ${betaaldCenten} cent, `
      + `verwacht ${bestelling.totaalCenten} cent. Mogelijk zijn de prijzen in `
      + 'config.js aangepast nadat de klant de betaling startte.',
    );
    // Niet blokkerend: de klant heeft betaald, de bestelling moet geleverd.
  }

  // --- 5. E-mails versturen -------------------------------------------------

  const testmodus = isTestmodus();
  const eigenaarAdres = process.env.EIGENAAR_EMAIL;

  const naarEigenaar = mailNaarEigenaar({
    bestelling, klant, bestelnummer, betaalId: betaling.id, testmodus,
  });
  const naarKlant = mailNaarKlant({ bestelling, klant, bestelnummer });

  const resultaten = await Promise.all([
    eigenaarAdres
      ? stuurEmail({
          naar: eigenaarAdres,
          antwoordNaar: klant.email,
          ...naarEigenaar,
        })
      : Promise.resolve({ ok: false, reden: 'EIGENAAR_EMAIL ontbreekt' }),

    klant.email
      ? stuurEmail({
          naar: klant.email,
          antwoordNaar: eigenaarAdres,
          ...naarKlant,
        })
      : Promise.resolve({ ok: false, reden: 'geen klant-e-mail' }),
  ]);

  console.log(
    `Bestelling ${bestelnummer} verwerkt. `
    + `Mail eigenaar: ${resultaten[0].ok ? 'verstuurd' : 'MISLUKT (' + resultaten[0].reden + ')'}. `
    + `Mail klant: ${resultaten[1].ok ? 'verstuurd' : 'MISLUKT (' + resultaten[1].reden + ')'}.`,
  );

  return ok();
}
