# Handleiding — Azro granola bestelsite

Deze handleiding legt stap voor stap uit hoe je de site online zet, betalingen
laat werken en prijzen aanpast. Je hebt geen programmeerkennis nodig.

**Volg de stappen in volgorde.** Reken op ongeveer een uur voor stap 1 tot 5.

---

## Inhoud

1. [Mollie-account aanmaken en je sleutels vinden](#1-mollie-account-aanmaken-en-je-sleutels-vinden)
2. [E-mails laten werken met Resend](#2-e-mails-laten-werken-met-resend)
3. [De site op Netlify zetten (gratis)](#3-de-site-op-netlify-zetten-gratis)
4. [Omgevingsvariabelen instellen in Netlify](#4-omgevingsvariabelen-instellen-in-netlify)
5. [Testen met de testsleutel](#5-testen-met-de-testsleutel)
6. [Apple Pay-domein verifiëren in Mollie](#6-apple-pay-domein-verifiëren-in-mollie)
7. [Overschakelen van test naar live](#7-overschakelen-van-test-naar-live)
8. [Prijzen en teksten aanpassen](#8-prijzen-en-teksten-aanpassen)
9. [De link in je Instagram-bio zetten](#9-de-link-in-je-instagram-bio-zetten)
10. [Lokaal testen op je eigen computer](#10-lokaal-testen-op-je-eigen-computer)
11. [Wat als er iets misgaat?](#11-wat-als-er-iets-misgaat)

---

## 1. Mollie-account aanmaken en je sleutels vinden

Mollie verwerkt de betalingen. Je betaalt per transactie, er is geen
abonnementskost.

### Account aanmaken

1. Ga naar **https://www.mollie.com/be/signup** en maak een account.
2. Vul je ondernemingsgegevens in (ondernemingsnummer, bankrekening, identiteitsbewijs).
   Mollie moet dit wettelijk controleren.
3. Je kan **meteen beginnen testen** terwijl de goedkeuring loopt. Echte
   betalingen ontvangen kan pas na goedkeuring (meestal 1 tot 3 werkdagen).

### Betaalmethodes activeren

1. In het Mollie-dashboard: **Instellingen → Betaalmethodes** (Settings → Payment methods).
2. Activeer:
   - **Bancontact** (verreweg het meest gebruikt in België)
   - **Creditcard** (Visa en Mastercard)
   - **Apple Pay**

### Je sleutels vinden

1. In het Mollie-dashboard: **Ontwikkelaars → API-sleutels**
   (Developers → API keys).
2. Je ziet twee sleutels:

   | Sleutel | Begint met | Waarvoor |
   |---|---|---|
   | **Testsleutel** | `test_` | Oefenen. Geen echt geld. |
   | **Live-sleutel** | `live_` | Echte betalingen. |

3. **Kopieer voorlopig alleen de testsleutel.** Die gebruik je in stap 4.

> ⚠️ **Deel je sleutels nooit.** Zet ze niet in een e-mail, screenshot of
> WhatsApp-bericht. Wie je live-sleutel heeft, kan betalingen aanmaken in jouw
> naam. Ze horen alleen thuis in de omgevingsvariabelen van Netlify (stap 4).

---

## 2. E-mails laten werken met Resend

Na elke betaling stuurt de site twee e-mails: één naar jou met de volledige
bestelling, en één naar de klant als bevestiging. Daarvoor gebruiken we
**Resend** (gratis tot 3.000 e-mails per maand — ruim voldoende).

1. Maak een account op **https://resend.com/signup**.
2. Ga naar **API Keys → Create API Key**.
   - Naam: `azro-granola`
   - Permission: **Sending access**
3. Kopieer de sleutel (begint met `re_`). **Je ziet ze maar één keer** — bewaar
   ze even veilig, je hebt ze nodig in stap 4.

### Afzender

Om te beginnen mag je de standaardafzender `onboarding@resend.dev` gebruiken.
Dat werkt meteen, maar e-mails komen mogelijk in de spam terecht.

**Later, als je een eigen domein hebt** (bv. `azrogranola.be`):

1. In Resend: **Domains → Add Domain**, vul je domeinnaam in.
2. Resend toont enkele DNS-records (SPF, DKIM). Voeg die toe bij je domeinnaam-
   leverancier.
3. Zodra het domein geverifieerd is, zet je in Netlify de variabele
   `AFZENDER_EMAIL` op bijvoorbeeld `Azro granola <bestellingen@azrogranola.be>`.

---

## 3. De site op Netlify zetten (gratis)

### Manier A — slepen en neerzetten (snelst, geen account met GitHub nodig)

1. Maak een account op **https://app.netlify.com/signup**.
2. Ga naar **Sites** en klik onderaan op **Deploy manually** (of sleep gewoon).
3. Sleep de **volledige projectmap** (`azro-granola`) in het venster.
   Dus niet alleen de map `site` — Netlify heeft ook `netlify.toml` en de map
   `netlify` nodig.
4. Netlify geeft je site een adres zoals `https://willekeurige-naam-123.netlify.app`.

> Nadeel van deze manier: bij elke wijziging moet je de map opnieuw slepen.

### Manier B — via GitHub (aanbevolen als je vaker iets aanpast)

1. Maak een gratis account op **https://github.com**.
2. Maak een nieuwe, **privé** repository, bijvoorbeeld `azro-granola`.
3. Upload de projectmap daarnaartoe (via de GitHub-website: **Add file →
   Upload files**, of met GitHub Desktop).
4. In Netlify: **Add new site → Import an existing project → GitHub**, en kies
   je repository.
5. Netlify leest de instellingen automatisch uit `netlify.toml`. Je hoeft niets
   in te vullen. Klik op **Deploy**.

Vanaf nu wordt de site **automatisch bijgewerkt** telkens je iets wijzigt op
GitHub.

### Je site een nettere naam geven

**Site configuration → Site details → Change site name**, bijvoorbeeld
`azro-granola`. Je adres wordt dan `https://azro-granola.netlify.app`.

> 🔒 **Belangrijk:** zorg dat het bestand `.env` nooit mee geüpload wordt naar
> GitHub. Het staat al in `.gitignore`, dus normaal gebeurt dat niet — maar
> controleer het toch even. Dat bestand bevat je geheime sleutels.

---

## 4. Omgevingsvariabelen instellen in Netlify

Hier zet je je geheime sleutels. Ze komen nooit in de website zelf terecht.

1. Ga in Netlify naar je site → **Site configuration → Environment variables**.
2. Klik op **Add a variable → Add a single variable** en voeg deze vier toe:

| Key | Value | Uitleg |
|---|---|---|
| `MOLLIE_API_KEY` | `test_...` | Je Mollie-**test**sleutel uit stap 1 |
| `RESEND_API_KEY` | `re_...` | Je Resend-sleutel uit stap 2 |
| `EIGENAAR_EMAIL` | `jouw@adres.be` | Hier komen de bestellingen binnen |
| `AFZENDER_EMAIL` | `Azro granola <onboarding@resend.dev>` | Afzender van de e-mails |

3. Laat bij elke variabele de scope op **All scopes / All deploy contexts** staan.
4. **Klik daarna op Deploys → Trigger deploy → Deploy site.**
   Omgevingsvariabelen worden pas actief na een nieuwe deploy.

---

## 5. Testen met de testsleutel

Met de testsleutel kan je de hele bestelling doorlopen zonder echt te betalen.

1. Open je site: `https://jouw-site.netlify.app`
2. Kies een granola, voeg toppings toe, leg ze in je winkelmandje.
3. Vul het afrekenformulier in met **je eigen e-mailadres** (zo zie je ook de
   klantbevestiging).
4. Klik op betalen. Je komt op de Mollie-testpagina.
5. Kies een methode en daarna de uitkomst: **Paid**, **Canceled**, **Failed**
   of **Expired**. Mollie vraagt bij een testbetaling gewoon welke uitkomst je
   wil simuleren — je hoeft geen kaartnummer in te vullen.

### Wat moet je zien?

| Je kiest | Verwacht resultaat |
|---|---|
| **Paid** | Bedankpagina met bestelnummer. Twee e-mails: één naar jou (onderwerp begint met `[TEST]`), één naar de klant. |
| **Canceled** | "Betaling geannuleerd" met een knop **Opnieuw proberen**. Winkelmandje blijft bewaard. |
| **Failed** | "Betaling niet gelukt" met dezelfde knop. |
| **Expired** | "Betaling verlopen". |

### Test ook deze dingen

- [ ] Meerdere verschillende zakjes in één bestelling
- [ ] Glutenvrij aanvinken (prijs stijgt met € 1,00 per zakje)
- [ ] Meerdere toppings (elk + € 1,50 per zakje)
- [ ] Wisselen tussen ophalen en leveren (totaal verandert)
- [ ] Het formulier leeg versturen → je moet duidelijke foutmeldingen zien
- [ ] De site op je telefoon openen

### De prijsberekening controleren

Open een terminal in de projectmap en typ:

```bash
npm test
```

Je krijgt een overzicht van alle prijsvoorbeelden. Bijvoorbeeld:

```
Honey Cacao, groot, glutenvrij, 2 toppings, aantal 2
  basis € 16,50 + glutenvrij € 1,00 + 2 toppings € 3,00 = € 20,50 per zakje × 2
  → € 41,00
```

Onderaan moet staan: `0 mislukt`. Doe dit telkens nadat je prijzen hebt
aangepast (stap 8).

> ⚠️ **Een testbetaling komt niet in je Mollie-uitbetalingen terecht.** Dat is
> normaal. Pas met de live-sleutel (stap 7) gaat er echt geld om.

---

## 6. Apple Pay-domein verifiëren in Mollie

Apple Pay werkt pas als Apple weet dat jouw website echt van jou is. Zonder
deze stap zien iPhone-gebruikers de Apple Pay-knop niet — ze kunnen dan gewoon
met Bancontact of kaart betalen, dus de site blijft werken.

1. Zorg dat je site online staat en je het definitieve adres kent
   (bv. `azro-granola.netlify.app`, of je eigen domein).
2. Mollie-dashboard: **Instellingen → Betaalmethodes → Apple Pay**.
3. Klik op **Domein toevoegen / Add domain** en vul je domeinnaam in
   **zonder `https://`**, dus bijvoorbeeld: `azro-granola.netlify.app`
4. Mollie doet de verificatie normaal automatisch.

### Als Mollie je om een verificatiebestand vraagt

Soms moet je zelf een bestand plaatsen:

1. Download het bestand `apple-developer-merchantid-domain-association`
   dat Mollie je geeft.
2. Maak in je projectmap deze mappen aan: `site/.well-known/`
3. Zet het bestand daarin, zonder de naam te veranderen. Het pad wordt dus:
   `site/.well-known/apple-developer-merchantid-domain-association`
4. Zet de site opnieuw online (stap 3).
5. Controleer dat het bestand bereikbaar is door dit adres in je browser te
   openen:
   `https://jouw-site.netlify.app/.well-known/apple-developer-merchantid-domain-association`
   Je moet een lap tekst zien.
6. Klik in Mollie op **Verifiëren**.

### Testen

Open je site op een **iPhone of Mac met Safari** waarop Apple Pay is ingesteld.
De knop "Betalen met Apple Pay" verschijnt alleen op toestellen die het
ondersteunen — dat is normaal en gewenst.

---

## 7. Overschakelen van test naar live

Doe dit pas als stap 5 helemaal goed verliep **en** je Mollie-account is
goedgekeurd.

1. Mollie-dashboard: zet de schakelaar bovenaan van **Test** naar **Live**.
2. Ga naar **Ontwikkelaars → API-sleutels** en kopieer de **live-sleutel**
   (begint met `live_`).
3. In Netlify: **Site configuration → Environment variables → `MOLLIE_API_KEY`
   → Options → Edit** en plak de live-sleutel.
4. **Deploys → Trigger deploy → Deploy site.**
5. Doe één echte bestelling van jezelf met een klein bedrag, en controleer:
   - [ ] De betaling lukt
   - [ ] Je krijgt de bestelmail (nu **zonder** `[TEST]` in het onderwerp)
   - [ ] De klant krijgt de bevestigingsmail
   - [ ] De betaling staat in je Mollie-dashboard onder **Betalingen**

Daarna kan je de bestelling bij jezelf terugbetalen via Mollie
(**Betalingen → de betaling → Terugbetalen**).

### Terug naar test

Zet `MOLLIE_API_KEY` opnieuw op je `test_`-sleutel en deploy opnieuw. De site
merkt dit zelf: bestelmails krijgen dan weer `[TEST]` in het onderwerp.

---

## 8. Prijzen en teksten aanpassen

**Alles staat in één bestand: `site/config.js`.**

Open het met Kladblok, TextEdit of een code-editor. Overal waar `⬅️ PAS AAN`
staat, mag je iets wijzigen.

### Een prijs wijzigen

```js
{ id: 'medium', naam: 'Medium', gewichtGram: 350, prijs: 9.50 },
{ id: 'groot',  naam: 'Groot',  gewichtGram: 650, prijs: 16.50 },
```

Gebruik een **punt** als decimaalteken, niet een komma: `12.00`, niet `12,00`.
Op de site verschijnt het automatisch als `€ 12,00`.

### Leverkost en ophaalplaats

```js
{
  id: 'ophalen',
  plaats: 'Antwerpen',                       // jouw gemeente
  prijs: 0,
  label: 'Ophalen in Antwerpen · gratis',    // tekst op de knop
  ...
},
{
  id: 'leveren',
  prijs: 4.50,
  label: 'Leveren aan huis · € 4,50',        // pas dit mee aan!
  ...
},
```

> ⚠️ Pas bij het wijzigen van `prijs` **ook** de tekst in `label` aan. Die twee
> worden niet automatisch gelijk gehouden.

### Beschrijving van een smaak

```js
{
  id: 'signature',
  naam: 'Signature',
  kort: 'Havermout, noten en een hint van vanille.',   // winkelpagina
  lang: 'Onze klassieker: krokante havermout met …',   // productpagina
  toppings: ['hennepzaad', 'beepollen', 'kokos'],
},
```

### Een nieuwe smaak toevoegen

Kopieer een volledig blok tussen `{` en `},` en pas het aan. Geef een nieuwe,
unieke `id` zonder spaties of hoofdletters:

```js
{
  id: 'peanut-butter',
  naam: 'Peanut Butter',
  kort: 'Pindakaas en zeezout.',
  lang: 'Romige pindakaas met geroosterde pinda’s en een snuif zeezout.',
  toppings: ['hennepzaad', 'kokos'],
},
```

### Een nieuwe topping toevoegen

Eerst bij `toppings` (de lijst met alle toppings):

```js
{ id: 'chiazaad', naam: 'Chiazaad' },
```

En daarna bij elke smaak waar hij mag voorkomen, in de lijst `toppings:`.

### Na elke wijziging

1. Sla het bestand op.
2. Voer `npm test` uit om te controleren dat de prijzen nog kloppen.
3. Zet de site opnieuw online (sleep de map naar Netlify, of upload naar GitHub).

> 💡 **Let op bij prijswijzigingen tijdens een lopende bestelling.** Heel
> zelden kan iemand net aan het betalen zijn wanneer jij een prijs aanpast.
> De klant betaalt dan de oude prijs. Dat is geen probleem — de bestelling komt
> gewoon binnen, en in je Netlify-logs staat een waarschuwing.

---

## 9. De link in je Instagram-bio zetten

1. Open Instagram op je telefoon → je profiel → **Profiel bewerken**.
2. Tik op **Links → Link toevoegen → Externe link**.
3. Plak je adres: `https://azro-granola.netlify.app`
4. Bij **Titel** vul je bijvoorbeeld `Bestel je granola` in.
5. Opslaan.

### Tips

- Zet in je bio een zinnetje als *"Verse granola · bestel via de link 👇"*.
- Maak een **Highlight** met een story die naar de link verwijst, zodat nieuwe
  volgers ze makkelijk terugvinden.
- Wil je later een eigen adres zoals `azrogranola.be`? Koop een domeinnaam
  (bv. bij Combell of Versio) en voeg hem in Netlify toe via
  **Domain management → Add a domain**. Netlify regelt het beveiligingscertificaat
  gratis. **Vergeet daarna stap 6 (Apple Pay) opnieuw te doen voor het nieuwe
  domein.**

---

## 10. Lokaal testen op je eigen computer

Handig als je iets wil uitproberen zonder de echte site aan te passen.

### Eenmalig installeren

Installeer **Node.js** (versie 18 of nieuwer) via **https://nodejs.org**.

### Je sleutels lokaal zetten

1. Maak een kopie van het bestand `.env.example` en noem die kopie `.env`.
2. Vul je **test**sleutels in (nooit je live-sleutel).

### Starten

Open een terminal in de projectmap en typ:

```bash
npx netlify dev
```

Open daarna **http://localhost:8888** in je browser.

### Wat werkt lokaal wel en niet?

| | Lokaal |
|---|---|
| De site bekijken en het winkelmandje gebruiken | ✅ |
| Doorgestuurd worden naar de Mollie-testcheckout | ✅ |
| De bedankpagina met de juiste status | ✅ |
| **De bestelmails** | ❌ |

De e-mails werken lokaal niet, omdat Mollie je computer niet kan bereiken om de
webhook op te roepen. **E-mails testen doe je op de echte Netlify-site** (stap 5).

### Alleen de berekeningen testen

```bash
npm test
```

---

## 11. Wat als er iets misgaat?

### Waar vind ik de foutmeldingen?

In Netlify: **Logs → Functions**. Kies `create-payment` of `mollie-webhook`.
Daar zie je per bestelling wat er gebeurde.

### "We konden de betaling niet starten"

| Mogelijke oorzaak | Oplossing |
|---|---|
| `MOLLIE_API_KEY` ontbreekt of is fout | Controleer de variabele in Netlify en **deploy opnieuw** |
| Je hebt de variabele toegevoegd maar niet opnieuw gedeployd | **Deploys → Trigger deploy** |
| De betaalmethode staat niet aan in Mollie | Mollie → Instellingen → Betaalmethodes |
| Je gebruikt een live-sleutel maar je account is nog niet goedgekeurd | Wacht op goedkeuring, of gebruik even de testsleutel |

### De betaling lukt, maar ik krijg geen e-mail

1. Kijk eerst in je **spammap**.
2. Netlify → **Logs → Functions → mollie-webhook**. Staat daar
   `Mail eigenaar: verstuurd`? Dan is ze buiten gegaan en ligt het aan je
   mailbox of spamfilter.
3. Staat er `MISLUKT (geen-sleutel)`? Dan ontbreekt `RESEND_API_KEY` in Netlify.
4. Staat er `MISLUKT (http-403)` of `http-422`? Dan klopt `AFZENDER_EMAIL` niet.
   Zet hem terug op `Azro granola <onboarding@resend.dev>`.
5. Zie je helemaal geen regel in de logs? Dan heeft Mollie de webhook niet
   kunnen oproepen. Controleer in Mollie (**Betalingen → de betaling →
   Webhook**) of er een fout staat.

**De betaling is in elk geval veilig.** Elke bestelling blijft zichtbaar in je
Mollie-dashboard onder **Betalingen**, met alle gegevens van de klant in het
veld *metadata*. Een gemiste e-mail betekent dus nooit een verloren bestelling.

### De Apple Pay-knop verschijnt niet

Dat is correct op Android, Windows en in Chrome. Apple Pay verschijnt alleen op
Apple-toestellen met Safari waarop Apple Pay is ingesteld, én nadat je domein
geverifieerd is (stap 6).

### Een klant zegt dat hij dubbel betaald heeft

Kijk in Mollie onder **Betalingen**. Zie je twee betalingen met status *Paid*?
Dan kan je er één terugbetalen via **de betaling → Terugbetalen**. Ziet één van
beide er *Expired* of *Failed* uit, dan is er maar één keer geld afgegaan.

### Ik krijg dezelfde bestelmail twee keer

Dat kan heel uitzonderlijk gebeuren als Mollie de webhook opnieuw oproept.
Kijk naar het **bestelnummer** in de mail: is dat hetzelfde, dan gaat het om
dezelfde bestelling en moet je ze maar één keer klaarmaken.

### Ik heb iets kapotgemaakt in `config.js`

De site toont dan een lege pagina. Meestal is er een komma of accolade te veel
of te weinig. Voer `npm test` uit — dat wijst de regel aan. Of haal je laatste
wijziging terug: Netlify bewaart elke vorige versie onder **Deploys**, waar je
met **Publish deploy** kan terugkeren naar een werkende versie.

---

## Overzicht van de bestanden

```
azro-granola/
├── site/                       ← de website zelf
│   ├── config.js               ← 🔧 HIER pas je prijzen en teksten aan
│   ├── index.html              ← winkel
│   ├── product.html            ← granola kiezen
│   ├── afrekenen.html          ← winkelmandje en gegevens
│   ├── bevestiging.html        ← bedankpagina
│   ├── css/stijl.css           ← vormgeving
│   ├── img/azro-logo.png       ← je logo
│   └── js/                     ← de werking van de pagina's
│       ├── prijs.js            ← de prijsberekening
│       └── winkelmandje.js     ← het winkelmandje
│
├── netlify/
│   ├── functions/              ← servercode (hier komen je sleutels)
│   │   ├── create-payment.mjs  ← maakt de Mollie-betaling
│   │   ├── mollie-webhook.mjs  ← verstuurt de e-mails na betaling
│   │   └── bestelling.mjs      ← bedankpagina haalt hier de status op
│   └── lib/                    ← gedeelde servercode
│
├── test/                       ← controleert of de prijzen kloppen
├── netlify.toml                ← instellingen voor Netlify
├── .env.example                ← voorbeeld van de sleutels
└── HANDLEIDING.md              ← dit bestand
```

---

## Hoe de prijs berekend wordt

```
prijs per zakje = basisprijs van de maat
                + € 1,00 als glutenvrij
                + € 1,50 per gekozen topping

regel           = prijs per zakje × aantal
totaal          = alle regels samen + leverkost
```

**Voorbeeld:** Honey Cacao, groot, glutenvrij, met cacao nibs en kokos, 2 stuks

```
  € 16,50   basisprijs groot
+ €  1,00   glutenvrij
+ €  3,00   2 toppings × € 1,50
───────────
  € 20,50   per zakje
×       2   aantal
───────────
  € 41,00
```

> 🔒 **Het totaal wordt altijd opnieuw berekend op de server**, los van wat de
> browser doorstuurt. Iemand die in zijn browser knoeit met de prijs, betaalt
> nog steeds het juiste bedrag.
