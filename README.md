# Azro granola — bestelsite

Mobiel-eerste bestelsite voor @azro.granola. Klanten komen via de Instagram-bio,
kiezen hun granola en betalen met Bancontact, kaart of Apple Pay via Mollie.

**👉 Nieuw hier? Lees [HANDLEIDING.md](HANDLEIDING.md).** Daarin staat stap voor
stap hoe je de site online zet, betalingen aanzet en prijzen aanpast.

---

## Snel starten

```bash
npx netlify dev
```

Open daarna http://localhost:8888

Kopieer eerst `.env.example` naar `.env` en vul je Mollie-**test**sleutel in.

## Prijzen aanpassen

Alles staat in **`site/config.js`**. Zoek naar `⬅️ PAS AAN`.

Controleer je wijziging daarna met:

```bash
npm test
```

## Techniek

- Statische HTML, CSS en vanilla JavaScript (ES-modules) — geen build-stap,
  geen framework
- Netlify Functions voor de server-kant
- Mollie Payments API voor betalingen
- Resend voor de bestel- en bevestigingsmails
- Geen database: bestellingen gaan per e-mail en staan in het Mollie-dashboard

## Mappen

| Pad | Inhoud |
|---|---|
| `site/config.js` | **Prijzen, smaken, toppings, teksten** |
| `site/js/prijs.js` | De prijsberekening (gedeeld door browser én server) |
| `site/js/winkelmandje.js` | Winkelmandje in localStorage |
| `netlify/functions/create-payment.mjs` | Maakt de Mollie-betaling |
| `netlify/functions/mollie-webhook.mjs` | Verstuurt de e-mails na betaling |
| `netlify/functions/bestelling.mjs` | Status voor de bevestigingspagina |
| `netlify/lib/` | Gedeelde servercode (Mollie, e-mail, sjablonen) |
| `test/` | Prijs- en servertests |
| `azro-handoff/` | De originele ontwerpbestanden (ter referentie) |

## Beveiliging

- **Het totaal wordt altijd opnieuw berekend op de server** uit `site/config.js`.
  Bedragen uit de browser worden genegeerd — zie `test/server.test.mjs`.
- Toppings worden gecontroleerd tegen de gekozen smaak; onbekende smaken,
  maten, soorten en aantallen worden geweigerd.
- API-sleutels komen uitsluitend uit omgevingsvariabelen en staan nooit in de
  frontend of in git.
- De site bouwt zelf geen kaartvelden; betalen gebeurt op de Mollie-checkout.
- De statusfunctie voor de bevestigingspagina geeft geen klantgegevens terug.

## Omgevingsvariabelen

| Variabele | Waarvoor |
|---|---|
| `MOLLIE_API_KEY` | Mollie-sleutel (`test_…` of `live_…`) |
| `RESEND_API_KEY` | Resend-sleutel voor de e-mails |
| `EIGENAAR_EMAIL` | Adres waar bestellingen binnenkomen |
| `AFZENDER_EMAIL` | Afzender van de e-mails |

Zie `.env.example`.

## Tests

```bash
npm test              # alles
npm run test:prijzen  # alleen de prijsberekening
npm run test:server   # functions, met nagebootste Mollie en Resend
```
