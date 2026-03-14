import nodemailer from 'nodemailer';
import type { EmailPayload, EmailFrom } from '../types';
import { getNodemailerConfig } from '../env';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  const cfg = getNodemailerConfig();

  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    ...(cfg.user ? { auth: { user: cfg.user, pass: cfg.pass } } : {}),
  });

  return transporter;
}

export async function send(payload: EmailPayload, from: EmailFrom): Promise<void> {
  await getTransporter().sendMail({
    from: `"${from.name}" <${from.email}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}

export async function verify(): Promise<void> {
  await getTransporter().verify();
}
