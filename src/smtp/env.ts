import { config } from 'dotenv';
import path from 'path';
import type { SmtpProvider, EmailFrom } from './types';

config({ path: path.resolve(process.cwd(), '.env') });

// ─── Types ───────────────────────────────────────────────────────────
export interface NodemailerConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export interface BrevoConfig {
  apiKey: string;
}

export interface ResendConfig {
  apiKey: string;
}

// ─── Constants ───────────────────────────────────────────────────────
const SMTP_PROVIDERS: SmtpProvider[] = ['BREVO', 'RESEND', 'NODEMAILER'];

const PROVIDER_LABELS: Record<SmtpProvider, string> = {
  BREVO: 'Brevo (API v3)',
  RESEND: 'Resend (SDK)',
  NODEMAILER: 'Nodemailer (SMTP)',
};

// ─── Active provider (single source of truth) ───────────────────────
const ACTIVE_PROVIDER: SmtpProvider = (() => {
  const raw = process.env.SMTP_PROVIDER;

  if (raw === undefined) {
    console.warn(`\x1b[33m⚠️  SMTP_PROVIDER non défini dans .env — défaut : NODEMAILER\x1b[0m`);
    console.warn(`\x1b[2m   Ajoutez SMTP_PROVIDER=BREVO|RESEND|NODEMAILER dans votre fichier .env\x1b[0m`);
    return 'NODEMAILER';
  }

  if (raw.trim() === '') {
    console.warn(`\x1b[33m⚠️  SMTP_PROVIDER est vide dans .env — défaut : NODEMAILER\x1b[0m`);
    console.warn(`\x1b[2m   Valeurs acceptées : ${SMTP_PROVIDERS.join(', ')}\x1b[0m`);
    return 'NODEMAILER';
  }

  const normalized = raw.trim().toUpperCase();
  if (SMTP_PROVIDERS.includes(normalized as SmtpProvider)) return normalized as SmtpProvider;

  console.error(`\x1b[31m\x1b[1m❌ SMTP_PROVIDER invalide : "${raw}"\x1b[0m`);
  console.error(`\x1b[33m   Valeurs acceptées : ${SMTP_PROVIDERS.join(', ')}\x1b[0m`);
  console.error(`\x1b[2m   Vérifiez votre fichier .env\x1b[0m`);
  return process.exit(1);
})();

// ─── Helpers ─────────────────────────────────────────────────────────
function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val || val.trim() === '') {
    console.error(`\x1b[31m\x1b[1m❌ Variable d'environnement manquante : ${name}\x1b[0m`);
    console.error(`\x1b[33m   Provider actif : ${ACTIVE_PROVIDER}\x1b[0m`);
    console.error(`\x1b[2m   Ajoutez ${name}=... dans votre fichier .env\x1b[0m`);
    return process.exit(1);
  }
  return val.trim();
}

// ─── Public API ─────────────────────────────────────────────────────
export const getSmtpProvider = (): SmtpProvider => ACTIVE_PROVIDER;
export const getProviderLabel = (): string => PROVIDER_LABELS[ACTIVE_PROVIDER];

export function getSmtpFrom(): EmailFrom {
  return {
    email: requireEnv('SMTP_FROM_EMAIL'),
    name: process.env.SMTP_FROM_NAME?.trim() || 'Atomic',
  };
}

export function getNodemailerConfig(): NodemailerConfig {
  return {
    host: requireEnv('SMTP_HOST'),
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER?.trim() ?? '',
    pass: process.env.SMTP_PASS?.trim() ?? '',
  };
}

export function getBrevoConfig(): BrevoConfig {
  return { apiKey: requireEnv('BREVO_API_KEY') };
}

export function getResendConfig(): ResendConfig {
  return { apiKey: requireEnv('RESEND_API_KEY') };
}

/** Masque une clé API pour les logs */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return '***';
  return key.substring(0, 4) + '...' + key.substring(key.length - 4);
}
