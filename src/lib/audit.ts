import { getDrizzle } from "@database/drizzle";
import { auditLog } from "@database/schemas";
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { isIP } from 'node:net';

export type AuditAction =
  | "SIGN_IN"
  | "SIGN_IN_FAILED"
  | "SIGN_UP"
  | "SIGN_UP_FAILED"
  | "SIGN_OUT"
  | "PASSWORD_CHANGE"
  | "PASSWORD_CHANGE_FAILED"
  | "PASSWORD_RESET_REQUEST"
  | "PASSWORD_RESET_COMPLETE"
  | "PASSWORD_RESET_COMPLETE_FAILED"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "USER_BAN"
  | "USER_UNBAN"
  | "USER_ROLE_CHANGE"
  | "IMPERSONATION_START"
  | "IMPERSONATION_STOP"
  | "ORG_CREATE"
  | "ORG_UPDATE"
  | "ORG_DELETE"
  | "ORG_MEMBER_ADD"
  | "ORG_MEMBER_REMOVE"
  | "ORG_MEMBER_ROLE_CHANGE"
  | "ORG_INVITATION_SEND"
  | "ORG_INVITATION_ACCEPT"
  | "ORG_INVITATION_REJECT"
  | "ORG_INVITATION_CANCEL"
  | "FILE_UPLOAD"
  | "FILE_DELETE"
  | "SITE_SETTINGS_UPDATE"
  | "SOCIAL_LINK_CREATE"
  | "SOCIAL_LINK_UPDATE"
  | "SOCIAL_LINK_DELETE"
  | "SOCIAL_LINK_REORDER"
  | "CONTACT_INFO_UPDATE"
  | "OPENING_HOURS_UPDATE"
  | "NAVIGATION_MENU_CREATE"
  | "NAVIGATION_MENU_UPDATE"
  | "NAVIGATION_MENU_DELETE"
  | "NAVIGATION_ITEM_CREATE"
  | "NAVIGATION_ITEM_UPDATE"
  | "NAVIGATION_ITEM_DELETE"
  | "PAGE_CREATE"
  | "PAGE_UPDATE"
  | "PAGE_DELETE"
  | "PAGE_PUBLISH"
  | "PAGE_SECTION_CREATE"
  | "PAGE_SECTION_UPDATE"
  | "PAGE_SECTION_DELETE"
  | "PAGE_SECTION_REORDER"
  | "THEME_UPDATE"
  | "THEME_CREATE"
  | "THEME_DELETE"
  | "USER_DATA_EXPORT"
  | "CONTACT_FORM_SUBMIT"
  | "EMAIL_SEND_FAILED"
  | "AUDIT_LOG_ACCESS";

export interface AuditEventInput {
  userId?: string | null;
  action: AuditAction;
  resource?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    const db = getDrizzle();
    await db.insert(auditLog).values({
      userId: input.userId ?? null,
      action: input.action,
      resource: input.resource ?? null,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (err) {
    console.error("[audit] Failed to log event:", err);
    const date = new Date().toISOString().slice(0, 10);
    const logsDir = join(process.cwd(), 'logs');
    const fallbackPath = join(logsDir, `audit-fallback-${date}.jsonl`);
    const record = JSON.stringify({ timestamp: new Date().toISOString(), ...input });
    mkdir(logsDir, { recursive: true, mode: 0o700 })
      .then(() => appendFile(fallbackPath, record + '\n', { mode: 0o600 }))
      .catch((fileErr) => {
        console.error('[audit] Fallback file write also failed:', fileErr);
      });
  }
}

/**
 * Extract client IP from request headers.
 *
 * SECURITY: This trusts x-forwarded-for / x-real-ip headers set by the reverse
 * proxy. In production the proxy (nginx / Caddy / CloudFlare) MUST overwrite
 * these headers so clients cannot spoof their IP.  If deployed without a trusted
 * proxy, set TRUST_PROXY=false so these headers are ignored.
 */
export function extractIp(headers: Headers): string | null {
  const trustProxy = process.env.TRUST_PROXY === 'true';
  if (!trustProxy) return null;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0].trim();
    if (isValidIp(ip)) return ip;
    return null;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp && isValidIp(realIp)) return realIp;
  return null;
}

/** Validate an IPv4 or IPv6 address using Node.js native implementation */
function isValidIp(ip: string): boolean {
  return isIP(ip) !== 0;
}
