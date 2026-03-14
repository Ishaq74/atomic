import { Resend } from 'resend';
import type { EmailPayload, EmailFrom } from '../types';
import { getResendConfig } from '../env';

let client: Resend | null = null;

function getClient(): Resend {
  if (client) return client;
  const { apiKey } = getResendConfig();
  client = new Resend(apiKey);
  return client;
}

export async function send(payload: EmailPayload, from: EmailFrom): Promise<void> {
  const { error } = await getClient().emails.send({
    from: `${from.name} <${from.email}>`,
    to: [payload.to],
    subject: payload.subject,
    html: payload.html || '',
    text: payload.text,
  });

  if (error) {
    throw new Error(`Resend: ${error.message}`);
  }
}

export async function verify(): Promise<void> {
  const { apiKey } = getResendConfig();

  // Resend n'a pas d'endpoint dédié "verify".
  // On tente /domains — si la clé est restreinte (send-only), on obtient 401
  // avec "restricted_api_key" : la clé est valide, juste limitée à l'envoi.
  const res = await fetch('https://api.resend.com/domains', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (res.ok) return;

  const text = await res.text().catch(() => '');

  // Clé send-only : 401 + restricted_api_key → la clé est valide
  if (res.status === 401 && text.includes('restricted_api_key')) {
    return; // clé valide mais restreinte à l'envoi — c'est OK
  }

  // 401 pour une autre raison = clé invalide
  throw new Error(`Resend API ${res.status}: ${text}`);
}
