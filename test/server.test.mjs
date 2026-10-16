// =============================================================================
//  SERVERTEST — controleert de Netlify Functions zonder echte Mollie-oproepen
//  Uitvoeren met:  node test/server.test.mjs
// =============================================================================
//  Mollie en Resend worden nagebootst, zodat we kunnen nakijken WELK bedrag
//  de server naar Mollie stuurt. Dat is de belangrijkste controle: het bedrag
//  mag nooit uit de browser komen.
// =============================================================================

process.env.MOLLIE_API_KEY = 'test_nepnepnepnepnepnepnepnepnep';
process.env.RESEND_API_KEY = 're_neptest';
process.env.EIGENAAR_EMAIL = 'eigenaar@voorbeeld.be';
process.env.URL = 'https://azro-granola.netlify.app';

let gelukt = 0;
let mislukt = 0;

function controleer(omschrijving, gekregen, verwacht) {
  if (gekregen === verwacht) {
    gelukt += 1;
    console.log(`  ✓ ${omschrijving}`);
  } else {
    mislukt += 1;
    console.log(`  ✗ ${omschrijving}\n      verwacht: ${verwacht}\n      gekregen: ${gekregen}`);
  }
}

function kop(tekst) { console.log(`\n${tekst}`); }

// --- Mollie en Resend nabootsen ---------------------------------------------

const verzonden = { mollie: [], resend: [] };
const echteFetch = globalThis.fetch;

globalThis.fetch = async (url, opties = {}) => {
  const adres = String(url);
  const body = opties.body ? JSON.parse(opties.body) : null;

  if (adres.startsWith('https://api.mollie.com/v2/payments') && opties.method === 'POST') {
    verzonden.mollie.push(body);
    return new Response(JSON.stringify({
      id: 'tr_TESTBETALING1',
      status: 'open',
      amount: body.amount,
      metadata: body.metadata,
      _links: { checkout: { href: 'https://www.mollie.com/checkout/test/tr_TESTBETALING1' } },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (adres.startsWith('https://api.mollie.com/v2/payments/')) {
    return new Response(JSON.stringify(nepBetaling), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (adres === 'https://api.resend.com/emails') {
    verzonden.resend.push(body);
    return new Response(JSON.stringify({ id: 'email_test' }), { status: 200 });
  }

  return echteFetch(url, opties);
};

let nepBetaling = null;

// --- Functions inladen ------------------------------------------------------

const { default: createPayment } = await import('../netlify/functions/create-payment.mjs');
const { default: webhook } = await import('../netlify/functions/mollie-webhook.mjs');
const { default: bestellingStatus } = await import('../netlify/functions/bestelling.mjs');

function postVerzoek(data) {
  return new Request('https://azro-granola.netlify.app/.netlify/functions/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

const geldigeKlant = {
  naam: 'Lies Peeters',
  email: 'lies@voorbeeld.be',
  instagram: '@liesp',
  straat: 'Kloosterstraat',
  nummer: '42',
  postcode: '2000',
  gemeente: 'Antwerpen',
  telefoon: '0470 12 34 56',
};

// --- Test 1: het bedrag wordt op de server berekend -------------------------

kop('Test 1 — de server berekent het bedrag zelf');

verzonden.mollie = [];
let antwoord = await createPayment(postVerzoek({
  regels: [{
    smaak: 'honey-cacao', maat: 'groot', soort: 'glutenvrij',
    toppings: ['cacaonibs', 'kokos'], aantal: 2,
  }],
  levering: 'ophalen',
  betaalmethode: 'kaart',
  klant: geldigeKlant,
}));

let data = await antwoord.json();
let naarMollie = verzonden.mollie[0];

controleer('antwoordstatus', antwoord.status, 200);
controleer('bedrag naar Mollie', naarMollie.amount.value, '41.00');
controleer('munt', naarMollie.amount.currency, 'EUR');
controleer('betaallink teruggegeven', data.checkoutUrl, 'https://www.mollie.com/checkout/test/tr_TESTBETALING1');
controleer('bestelnummer gemaakt', /^AZ-\d{6}-[A-Z2-9]{4}$/.test(data.bestelnummer), true);
controleer('methodes beperkt tot kaart', JSON.stringify(naarMollie.method), '["bancontact","creditcard"]');
controleer('webhook ingesteld', naarMollie.webhookUrl, 'https://azro-granola.netlify.app/.netlify/functions/mollie-webhook');
controleer('redirect ingesteld', naarMollie.redirectUrl, 'https://azro-granola.netlify.app/bevestiging.html?id={paymentId}');
controleer('taal', naarMollie.locale, 'nl_BE');

// --- Test 2: een bedrag uit de browser wordt genegeerd ----------------------

kop('Test 2 — gesjoemel vanuit de browser heeft geen effect');

verzonden.mollie = [];
await createPayment(postVerzoek({
  regels: [{
    smaak: 'honey-cacao', maat: 'groot', soort: 'glutenvrij',
    toppings: ['cacaonibs', 'kokos'], aantal: 2,
    prijs: 0.01, regelCenten: 1, // ← probeert een eigen bedrag mee te geven
  }],
  levering: 'ophalen',
  totaal: 0.01,        // ← en een eigen totaal
  totaalCenten: 1,
  betaalmethode: 'kaart',
  klant: geldigeKlant,
}));

controleer('bedrag blijft het echte bedrag', verzonden.mollie[0].amount.value, '41.00');

// --- Test 3: ongeldige bestellingen worden geweigerd ------------------------

kop('Test 3 — ongeldige bestellingen worden geweigerd');

async function weiger(omschrijving, data, verwachteStatus = 400) {
  const r = await createPayment(postVerzoek(data));
  const j = await r.json().catch(() => ({}));
  controleer(`${omschrijving} (status ${verwachteStatus})`, r.status, verwachteStatus);
  if (j.fout) console.log(`      melding: "${j.fout}"`);
}

await weiger('topping hoort niet bij de smaak', {
  regels: [{ smaak: 'signature', maat: 'groot', soort: 'normaal', toppings: ['cacaonibs'], aantal: 1 }],
  levering: 'ophalen', betaalmethode: 'kaart', klant: geldigeKlant,
});

await weiger('leeg winkelmandje', {
  regels: [], levering: 'ophalen', betaalmethode: 'kaart', klant: geldigeKlant,
});

await weiger('onbekende maat', {
  regels: [{ smaak: 'signature', maat: 'gigantisch', soort: 'normaal', toppings: [], aantal: 1 }],
  levering: 'ophalen', betaalmethode: 'kaart', klant: geldigeKlant,
});

await weiger('ontbrekende naam', {
  regels: [{ smaak: 'signature', maat: 'groot', soort: 'normaal', toppings: [], aantal: 1 }],
  levering: 'ophalen', betaalmethode: 'kaart',
  klant: { ...geldigeKlant, naam: '' },
});

await weiger('ongeldig e-mailadres', {
  regels: [{ smaak: 'signature', maat: 'groot', soort: 'normaal', toppings: [], aantal: 1 }],
  levering: 'ophalen', betaalmethode: 'kaart',
  klant: { ...geldigeKlant, email: 'geen-adres' },
});

await weiger('aantal van 9999', {
  regels: [{ smaak: 'signature', maat: 'groot', soort: 'normaal', toppings: [], aantal: 9999 }],
  levering: 'ophalen', betaalmethode: 'kaart', klant: geldigeKlant,
});

// --- Test 4: Apple Pay ------------------------------------------------------

kop('Test 4 — Apple Pay wordt als aparte methode doorgegeven');

verzonden.mollie = [];
await createPayment(postVerzoek({
  regels: [{ smaak: 'signature', maat: 'medium', soort: 'normaal', toppings: [], aantal: 1 }],
  levering: 'leveren', betaalmethode: 'applepay', klant: geldigeKlant,
}));

controleer('methode', verzonden.mollie[0].method, 'applepay');
controleer('bedrag met levering', verzonden.mollie[0].amount.value, '14.00'); // 9,50 + 4,50

// --- Test 5: metadata bevat de volledige bestelling -------------------------

kop('Test 5 — de bestelling zit volledig in de metadata (max 1 kB)');

const meta = verzonden.mollie[0].metadata;
controleer('bestelnummer aanwezig', typeof meta.nr === 'string', true);
controleer('leveringswijze aanwezig', meta.lev, 'leveren');
controleer('klantnaam aanwezig', meta.klant.naam, 'Lies Peeters');
controleer('onder 1 kB', JSON.stringify(meta).length < 1000, true);
console.log(`      metadata is ${JSON.stringify(meta).length} bytes`);

// --- Test 6: webhook verstuurt twee e-mails bij "paid" ----------------------

kop('Test 6 — webhook stuurt bij "paid" twee e-mails');

nepBetaling = {
  id: 'tr_TESTBETALING1',
  status: 'paid',
  amount: { currency: 'EUR', value: '41.00' },
  metadata: {
    nr: 'AZ-261016-TEST',
    lev: 'ophalen',
    regels: [{ s: 'honey-cacao', m: 'groot', t: 'glutenvrij', x: ['cacaonibs', 'kokos'], a: 2 }],
    klant: geldigeKlant,
  },
};

verzonden.resend = [];
let webhookAntwoord = await webhook(new Request('https://x/.netlify/functions/mollie-webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'id=tr_TESTBETALING1',
}));

controleer('webhook antwoordt met 200', webhookAntwoord.status, 200);
controleer('twee e-mails verstuurd', verzonden.resend.length, 2);

const mailEigenaar = verzonden.resend.find((m) => m.to[0] === 'eigenaar@voorbeeld.be');
const mailKlant = verzonden.resend.find((m) => m.to[0] === 'lies@voorbeeld.be');

controleer('eigenaar krijgt mail', !!mailEigenaar, true);
controleer('klant krijgt mail', !!mailKlant, true);
controleer('onderwerp eigenaar bevat bedrag', mailEigenaar.subject.includes('€ 41,00'), true);
controleer('onderwerp eigenaar bevat bestelnummer', mailEigenaar.subject.includes('AZ-261016-TEST'), true);
controleer('eigenaar ziet dat het een test is', mailEigenaar.subject.startsWith('[TEST]'), true);
controleer('mail eigenaar bevat adres', mailEigenaar.text.includes('Kloosterstraat 42, 2000 Antwerpen'), true);
controleer('mail eigenaar bevat telefoon', mailEigenaar.text.includes('0470 12 34 56'), true);
controleer('mail eigenaar bevat Instagram', mailEigenaar.text.includes('@liesp'), true);
controleer('mail eigenaar bevat de toppings', mailEigenaar.text.includes('Cacao nibs'), true);
controleer('mail eigenaar bevat glutenvrij', mailEigenaar.text.includes('Glutenvrij'), true);
controleer('mail klant bevat bestelnummer', mailKlant.text.includes('AZ-261016-TEST'), true);
controleer('mail klant bevat totaal', mailKlant.text.includes('€ 41,00'), true);
controleer('antwoordadres klant → eigenaar', mailKlant.reply_to, 'eigenaar@voorbeeld.be');

console.log('\n  — Onderwerp eigenaar: ' + mailEigenaar.subject);
console.log('  — Onderwerp klant:    ' + mailKlant.subject);

// --- Test 7: webhook doet niets bij andere statussen ------------------------

kop('Test 7 — webhook stuurt niets bij geannuleerde betaling');

nepBetaling = { ...nepBetaling, status: 'canceled' };
verzonden.resend = [];
webhookAntwoord = await webhook(new Request('https://x/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'id=tr_TESTBETALING1',
}));

controleer('antwoordt met 200', webhookAntwoord.status, 200);
controleer('geen e-mails verstuurd', verzonden.resend.length, 0);

// --- Test 8: statusfunctie voor de bevestigingspagina -----------------------

kop('Test 8 — bevestigingspagina krijgt status zonder privégegevens');

nepBetaling = { ...nepBetaling, status: 'paid' };
const statusAntwoord = await bestellingStatus(
  new Request('https://x/.netlify/functions/bestelling?id=tr_TESTBETALING1'),
);
const status = await statusAntwoord.json();

controleer('status', status.status, 'paid');
controleer('bestelnummer', status.bestelnummer, 'AZ-261016-TEST');
controleer('bedrag', status.bedrag, '€ 41,00');
controleer('leveringswijze', status.leveringNaam, 'Ophalen');
controleer('GEEN klantgegevens gelekt', JSON.stringify(status).includes('Kloosterstraat'), false);
controleer('GEEN e-mailadres gelekt', JSON.stringify(status).includes('lies@voorbeeld.be'), false);

const slechtId = await bestellingStatus(new Request('https://x/?id=../../geheim'));
controleer('ongeldig id geweigerd', slechtId.status, 400);

// --- Uitslag -----------------------------------------------------------------

console.log(`\n${'─'.repeat(50)}`);
console.log(`${gelukt} geslaagd, ${mislukt} mislukt`);
process.exit(mislukt === 0 ? 0 : 1);
