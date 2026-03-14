import type { EmailPayload, EmailFrom } from '../types';
import { getBrevoConfig } from '../env';

const API_URL = 'https://api.brevo.com/v3/smtp/email';

export async function send(payload: EmailPayload, from: EmailFrom): Promise<void> {
  const { apiKey } = getBrevoConfig();

  const body = {
    sender: { name: from.name, email: from.email },
    to: [{ email: payload.to }],
    subject: payload.subject,
    htmlContent: payload.html,
    textContent: payload.text,
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Brevo API ${res.status}: ${text}`);
  }
}

export async function verify(): Promise<void> {
  const { apiKey } = getBrevoConfig();

  const res = await fetch('https://api.brevo.com/v3/account', {
    headers: { 'api-key': apiKey, 'Accept': 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Brevo API ${res.status}: ${text}`);
  }
}
