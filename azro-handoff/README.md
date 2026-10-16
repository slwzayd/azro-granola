# Azro granola – bestelsite (overdracht voor Claude Code)

Bouw een kleine, mobiel-eerst webshop waar klanten vanuit de Instagram-bio (@azro.granola) granola bestellen en betalen met Bancontact/bankkaart of Apple Pay.

## Ontwerp

De map `ontwerp/` bevat de vier schermen als HTML-ontwerpen. Neem layout, teksten, kleuren en stijl daaruit over:

1. `1-Winkel.dc.html` – overzicht van de 3 smaken
2. `2-Product.dc.html` – smaak, maat, normaal/glutenvrij, toppings, aantal
3. `3-Afrekenen.dc.html` – overzicht, ophalen/leveren, gegevens, adres, betaalmethode
4. `4-Bevestiging.dc.html` – bedankpagina na betaling

Let op: deze bestanden zijn ontwerpbestanden, geen productiecode. De tags `<x-dc>`, `<sc-for>`, `<sc-if>` en `{{...}}` en de `class Component extends DCLogic`-scripts zijn een ontwerpformaat. Herschrijf ze naar gewone HTML/CSS/JS of een framework naar keuze. De `<script src="./support.js">`-regel bestaat niet buiten de ontwerptool en mag weg.

Logo: `azro-logo.png` (zwart, transparante achtergrond). In de ontwerpen staat het als `/_blob/8d18f27b…` → vervang door het lokale logobestand.

### Stijl
- Achtergrond `#F7F7F5`, kaarten `#FFFFFF`, randen `#E4E4E0`
- Tekst `#1B1B1B`, secundaire tekst `#5F5F5A`
- Merkkleur lime `#CDEB7F`: alleen als accent (hoofdknoppen, vinkjes, geselecteerde opties met lichte tint `#F3F9E2`). Niet te kleurrijk.
- Lettertypes (Google Fonts): Bricolage Grotesque (titels, 800), DM Sans (tekst, 400/600)
- Mobiel eerst (390 px breed), moet ook netjes werken op desktop
- Taal: Nederlands (België)

## Producten en prijsregels

| Smaak | Mogelijke toppings |
|---|---|
| Signature | Hennepzaad, Bee pollen, Kokos gerasp |
| Apple Cinnamon | Hennepzaad, Bee pollen, Kokos gerasp |
| Honey Cacao | Cacao nibs, Hennepzaad, Kokos gerasp |

- Maten: Medium en Groot – prijs en gewicht: **[NOG IN TE VULLEN]**
- Soort: Normaal (inbegrepen) of Glutenvrij (**+ € 1,00** per zakje)
- Elke topping: **+ € 1,50** per zakje, meerdere toppings mogelijk
- Levering: ophalen in [gemeente] gratis, leveren aan huis **[PRIJS]**
- Prijs per zakje = basisprijs maat + glutenvrij-toeslag + aantal toppings × 1,50
- Winkelmandje met meerdere zakjes (verschillende smaken/opties) moet mogelijk zijn
- Zet alle prijzen in één config-bestand zodat de eigenaar ze makkelijk kan aanpassen
- **Bereken het totaal altijd opnieuw op de server.** Vertrouw nooit een bedrag dat de browser doorstuurt.

## Afrekenen

Verplichte velden: naam, e-mail, straat, nummer, postcode, gemeente.
Optioneel: Instagram-naam, telefoon.
Keuze: ophalen of leveren.

## Betalen – Mollie

- Gebruik de Mollie Payments API (https://docs.mollie.com) met methodes `bancontact`, `creditcard` en `applepay`.
- Stuur de klant naar de Mollie-checkout (redirect); bouw zelf géén kaartnummer-velden. Het kaartformulier in het ontwerp is alleen illustratief.
- De API-sleutel staat in een omgevingsvariabele (`MOLLIE_API_KEY`) en komt nooit in de frontend.
- Webhook: bij status `paid` stuurt de server een e-mail naar de eigenaar met de volledige bestelling (smaak, maat, soort, toppings, aantal, gegevens, adres, ophalen/leveren, totaal) en een bevestigingsmail naar de klant.
- Na betaling: redirect naar de bevestigingspagina met bestelnummer.
- Eerst testen met de Mollie testsleutel (`test_…`).

## Hosting

- Netlify (gratis plan): statische site + Netlify Functions voor `create-payment` en `mollie-webhook`.
- Geen database nodig; bestellingen gaan per e-mail (bijv. via Resend of een andere gratis e-maildienst) en zijn zichtbaar in het Mollie-dashboard.
- Schrijf een korte handleiding in het Nederlands: hoe deployen op Netlify, omgevingsvariabelen instellen, Apple Pay-domein verifiëren in Mollie, en de link in de Instagram-bio zetten.

## Nog in te vullen door de eigenaar
- Prijzen en gewicht per maat
- Leverprijs en ophaalplaats/regio
- Korte beschrijving per smaak
- Contact-e-mail
