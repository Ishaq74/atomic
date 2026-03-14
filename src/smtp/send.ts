import type { EmailPayload } from './types';
import { getSmtpProvider, getSmtpFrom } from './env';

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const provider = getSmtpProvider();
  const from = getSmtpFrom();

  switch (provider) {
    case 'BREVO': {
      const { send } = await import('./providers/brevo');
      return send(payload, from);
    }
    case 'RESEND': {
      const { send } = await import('./providers/resend');
      return send(payload, from);
    }
    case 'NODEMAILER': {
      const { send } = await import('./providers/nodemailer');
      return send(payload, from);
    }
  }
}
