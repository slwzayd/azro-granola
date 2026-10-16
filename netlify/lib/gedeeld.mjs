// =============================================================================
//  GEDEELDE SERVERCODE — Mollie, e-mail en hulpjes
// =============================================================================
//  Deze code draait alleen op de server (Netlify Functions).
//  API-sleutels komen uitsluitend uit omgevingsvariabelen.
// =============================================================================

const MOLLIE_API = 'https://api.mollie.com/v2';

// --- Antwoorden -------------------------------------------------------------

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function foutAntwoord(bericht, status = 400) {
  return json({ fout: bericht }, status);
}

// --- Mollie -----------------------------------------------------------------

export function mollieSleutel() {
  const sleutel = process.env.MOLLIE_API_KEY;
  if (!sleutel) {
    throw new Error('MOLLIE_API_KEY ontbreekt. Stel de omgevingsvariabele in.');
  }
  return sleutel;
}

/** Werkt de sleutel in testmodus? (test_… vs live_…) */
export function isTestmodus() {
  return String(process.env.MOLLIE_API_KEY || '').startsWith('test_');
}

async function mollie(pad, opties = {}) {
  const antwoord = await fetch(`${MOLLIE_API}${pad}`, {
    ...opties,
    headers: {
      Authorization: `Bearer ${mollieSleutel()}`,
      'Content-Type': 'application/json',
      ...(opties.headers || {}),
    },
  });

  const data = await antwoord.json().catch(() => null);

  if (!antwoord.ok) {
    const detail = (data && (data.detail || data.title)) || `HTTP ${antwoord.status}`;
    throw new Error(`Mollie: ${detail}`);
  }
  return data;
}

export function maakBetaling(payload) {
  return mollie('/payments', { method: 'POST', body: JSON.stringify(payload) });
}

export function haalBetalingOp(id) {
  return mollie(`/payments/${encodeURIComponent(id)}`);
}

// --- Basis-URL van de site --------------------------------------------------

/**
 * De publieke URL van de site. Netlify zet deze automatisch klaar.
 * Valt terug op de URL van het binnenkomende verzoek (handig bij `netlify dev`).
 */
export function basisUrl(request) {
  const uitOmgeving =
    process.env.DEPLOY_PRIME_URL || process.env.URL || process.env.SITE_URL;
  if (uitOmgeving) return uitOmgeving.replace(/\/$/, '');
  return new URL(request.url).origin;
}

/** Mollie kan localhost niet bereiken — dan sturen we geen webhook-URL mee. */
export function isLokaal(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(url);
}

// --- Bestelnummer -----------------------------------------------------------

/** Bijvoorbeeld: AZ-261016-4K7Q */
export function maakBestelnummer(datum = new Date()) {
  const jj = String(datum.getFullYear()).slice(2);
  const mm = String(datum.getMonth() + 1).padStart(2, '0');
  const dd = String(datum.getDate()).padStart(2, '0');

  const tekens = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // zonder 0/O en 1/I
  let staart = '';
  const willekeurig = new Uint8Array(4);
  crypto.getRandomValues(willekeurig);
  for (const b of willekeurig) staart += tekens[b % tekens.length];

  return `AZ-${jj}${mm}${dd}-${staart}`;
}

// --- Tekst ------------------------------------------------------------------

/** Maakt tekst veilig voor gebruik in HTML (e-mails). */
export function veilig(tekst) {
  return String(tekst ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Snoeit en begrenst invoer van de klant. */
export function schoon(waarde, maxLengte = 120) {
  return String(waarde ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLengte);
}

// --- E-mail versturen via Resend --------------------------------------------

/**
 * Verstuurt een e-mail via Resend (https://resend.com — gratis plan).
 * Gooit géén fout naar boven: een mislukte e-mail mag de webhook niet laten
 * falen, want dan blijft Mollie het eindeloos opnieuw proberen.
 */
export async function stuurEmail({ naar, onderwerp, html, tekst, antwoordNaar }) {
  const sleutel = process.env.RESEND_API_KEY;
  const afzender = process.env.AFZENDER_EMAIL || 'Azro granola <onboarding@resend.dev>';

  if (!sleutel) {
    console.error('RESEND_API_KEY ontbreekt — e-mail niet verstuurd naar', naar);
    return { ok: false, reden: 'geen-sleutel' };
  }

  try {
    const antwoord = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sleutel}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: afzender,
        to: [naar],
        subject: onderwerp,
        html,
        text: tekst,
        ...(antwoordNaar ? { reply_to: antwoordNaar } : {}),
      }),
    });

    if (!antwoord.ok) {
      const detail = await antwoord.text().catch(() => '');
      console.error('Resend gaf een fout:', antwoord.status, detail);
      return { ok: false, reden: `http-${antwoord.status}` };
    }

    return { ok: true };
  } catch (fout) {
    console.error('E-mail versturen mislukt:', fout.message);
    return { ok: false, reden: fout.message };
  }
}
