// =============================================================================
//  bestelling — de bevestigingspagina vraagt hier de echte betaalstatus op
// =============================================================================
//  Geeft bewust GEEN klantgegevens terug: alleen status, bestelnummer, bedrag
//  en of het om ophalen of leveren gaat.
// =============================================================================

import { vindLevering } from '../../site/js/prijs.js';
import { json, foutAntwoord, haalBetalingOp } from '../lib/gedeeld.mjs';

export default async function handler(request) {
  const id = new URL(request.url).searchParams.get('id');

  // Mollie-betaal-ids zien eruit als tr_WDqYK6vllg
  if (!id || !/^tr_[A-Za-z0-9]+$/.test(id)) {
    return foutAntwoord('Geen geldige betaling opgegeven.', 400);
  }

  let betaling;
  try {
    betaling = await haalBetalingOp(id);
  } catch (fout) {
    console.error('Status ophalen mislukt:', fout.message);
    return foutAntwoord('We konden de betaling niet nakijken.', 502);
  }

  const metadata = betaling.metadata || {};
  const levering = vindLevering(metadata.lev);

  let leveringDetail = null;
  if (levering) {
    leveringDetail = levering.id === 'ophalen'
      ? (levering.plaats || 'We nemen contact op')
      : 'Aan huis';
  }

  return json({
    status: betaling.status,
    bestelnummer: metadata.nr || null,
    bedrag: betaling.amount
      ? `€ ${Number(betaling.amount.value).toFixed(2).replace('.', ',')}`
      : null,
    leveringNaam: levering ? levering.naam : null,
    leveringDetail,
  });
}
