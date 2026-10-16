// =============================================================================
//  E-MAILSJABLONEN — bestelling naar de eigenaar, bevestiging naar de klant
// =============================================================================

import { CONFIG } from '../../site/config.js';
import { formatCenten } from '../../site/js/prijs.js';
import { veilig } from './gedeeld.mjs';

const LIME = '#CDEB7F';
const DONKER = '#1B1B1B';
const ZACHT = '#5F5F5A';
const RAND = '#E4E4E0';

function omhulsel(binnenkant) {
  return `<!doctype html>
<html lang="nl">
<body style="margin:0;padding:24px;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${DONKER}">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid ${RAND};border-radius:16px;padding:28px">
    ${binnenkant}
  </div>
  <p style="max-width:560px;margin:16px auto 0;font-size:12px;color:${ZACHT};text-align:center">
    ${veilig(CONFIG.winkel.naam)} · @${veilig(CONFIG.winkel.instagram)}
  </p>
</body>
</html>`;
}

/** De bestelregels als HTML-tabel. */
function regelsHtml(bestelling) {
  const rijen = bestelling.regels.map((r) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${RAND};vertical-align:top">
        <strong>${veilig(r.omschrijving)}</strong><br>
        <span style="font-size:13px;color:${ZACHT}">${veilig(r.detail)}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid ${RAND};text-align:right;white-space:nowrap;vertical-align:top">
        ${veilig(formatCenten(r.regelCenten))}
      </td>
    </tr>`).join('');

  const levering = `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${RAND};color:${ZACHT}">
        ${veilig(bestelling.levering.naam)}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid ${RAND};text-align:right;color:${ZACHT}">
        ${bestelling.leverCenten > 0 ? veilig(formatCenten(bestelling.leverCenten)) : 'gratis'}
      </td>
    </tr>`;

  const totaal = `
    <tr>
      <td style="padding:14px 0 0;font-size:17px"><strong>Totaal</strong></td>
      <td style="padding:14px 0 0;text-align:right;font-size:17px">
        <strong>${veilig(formatCenten(bestelling.totaalCenten))}</strong>
      </td>
    </tr>`;

  return `<table style="width:100%;border-collapse:collapse;font-size:15px">
    ${rijen}${levering}${totaal}
  </table>`;
}

/** Dezelfde regels als platte tekst. */
function regelsTekst(bestelling) {
  const regels = bestelling.regels
    .map((r) => `- ${r.omschrijving} (${r.detail}) — ${formatCenten(r.regelCenten)}`)
    .join('\n');

  const levering = `- ${bestelling.levering.naam} — `
    + (bestelling.leverCenten > 0 ? formatCenten(bestelling.leverCenten) : 'gratis');

  return `${regels}\n${levering}\n\nTotaal: ${formatCenten(bestelling.totaalCenten)}`;
}

// --- 1. Mail naar de eigenaar ------------------------------------------------

export function mailNaarEigenaar({ bestelling, klant, bestelnummer, betaalId, testmodus }) {
  const adres = `${klant.straat} ${klant.nummer}, ${klant.postcode} ${klant.gemeente}`;

  const gegevens = [
    ['Naam', klant.naam],
    ['E-mail', klant.email],
    ['Telefoon', klant.telefoon || '—'],
    ['Instagram', klant.instagram || '—'],
    ['Adres', adres],
    ['Ophalen / leveren', bestelling.levering.naam],
    ['Bestelnummer', bestelnummer],
    ['Mollie-betaling', betaalId],
  ];

  const gegevensHtml = gegevens.map(([label, waarde]) => `
    <tr>
      <td style="padding:6px 12px 6px 0;color:${ZACHT};white-space:nowrap;vertical-align:top">${veilig(label)}</td>
      <td style="padding:6px 0;vertical-align:top">${veilig(waarde)}</td>
    </tr>`).join('');

  const testbanner = testmodus
    ? `<p style="margin:0 0 16px;padding:10px 14px;background:#FFF6DA;border:1px solid #E6C86A;border-radius:10px;font-size:13px">
         <strong>TESTBESTELLING</strong> — deze betaling kwam via de Mollie-testsleutel. Er is geen echt geld betaald.
       </p>`
    : '';

  const html = omhulsel(`
    ${testbanner}
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:${ZACHT}">Nieuwe bestelling</p>
    <h1 style="margin:0 0 20px;font-size:26px">${veilig(bestelnummer)}</h1>
    <div style="display:inline-block;padding:6px 12px;background:${LIME};border-radius:999px;font-size:13px;font-weight:600;margin-bottom:20px">
      Betaald · ${veilig(formatCenten(bestelling.totaalCenten))}
    </div>
    ${regelsHtml(bestelling)}
    <h2 style="margin:28px 0 8px;font-size:17px">Klantgegevens</h2>
    <table style="width:100%;border-collapse:collapse;font-size:15px">${gegevensHtml}</table>
  `);

  const tekst = [
    testmodus ? '*** TESTBESTELLING (Mollie-testsleutel) ***\n' : '',
    `Nieuwe bestelling ${bestelnummer} — BETAALD`,
    '',
    regelsTekst(bestelling),
    '',
    'Klantgegevens',
    ...gegevens.map(([label, waarde]) => `${label}: ${waarde}`),
  ].join('\n');

  return {
    onderwerp: `${testmodus ? '[TEST] ' : ''}Nieuwe bestelling ${bestelnummer} · `
      + `${formatCenten(bestelling.totaalCenten)} · ${klant.naam}`,
    html,
    tekst,
  };
}

// --- 2. Bevestiging naar de klant --------------------------------------------

export function mailNaarKlant({ bestelling, klant, bestelnummer }) {
  const ophalen = bestelling.levering.id === 'ophalen';
  const plaats = bestelling.levering.plaats || '';

  const vervolg = ophalen
    ? `Je bestelling is betaald. We laten je per e-mail weten wanneer ze klaarstaat${plaats ? ` om af te halen in ${plaats}` : ''}.`
    : `Je bestelling is betaald. We bezorgen ze op ${klant.straat} ${klant.nummer}, ${klant.postcode} ${klant.gemeente} en laten je weten wanneer ze onderweg is.`;

  const html = omhulsel(`
    <div style="width:56px;height:56px;border-radius:999px;background:${LIME};box-shadow:inset 0 0 0 2px ${DONKER};text-align:center;line-height:56px;font-size:28px;margin-bottom:20px">✓</div>
    <h1 style="margin:0 0 12px;font-size:28px;line-height:1.1">Bedankt ${veilig(klant.naam.split(' ')[0])}! Je granola komt eraan.</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${ZACHT}">${veilig(vervolg)}</p>
    <p style="margin:0 0 6px;font-size:13px;color:${ZACHT}">Bestelnummer</p>
    <p style="margin:0 0 24px;font-size:18px"><strong>${veilig(bestelnummer)}</strong></p>
    ${regelsHtml(bestelling)}
    <p style="margin:28px 0 0;font-size:14px;line-height:1.6;color:${ZACHT}">
      Vragen over je bestelling? Antwoord gerust op deze e-mail of stuur een bericht op Instagram via
      <a href="https://instagram.com/${veilig(CONFIG.winkel.instagram)}" style="color:${DONKER}">@${veilig(CONFIG.winkel.instagram)}</a>.
    </p>
  `);

  const tekst = [
    `Bedankt ${klant.naam.split(' ')[0]}! Je granola komt eraan.`,
    '',
    vervolg,
    '',
    `Bestelnummer: ${bestelnummer}`,
    '',
    regelsTekst(bestelling),
    '',
    `Vragen? Antwoord op deze e-mail of stuur een bericht op Instagram: @${CONFIG.winkel.instagram}`,
  ].join('\n');

  return {
    onderwerp: `Je bestelling bij ${CONFIG.winkel.naam} · ${bestelnummer}`,
    html,
    tekst,
  };
}
