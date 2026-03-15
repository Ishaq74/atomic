import { getDrizzle } from "@database/drizzle";
import { auditLog } from "@database/schemas";

export type AuditAction =
  | "SIGN_IN"
  | "SIGN_UP"
  | "SIGN_OUT"
  | "PASSWORD_CHANGE"
  | "PASSWORD_RESET_REQUEST"
  | "PASSWORD_RESET_COMPLETE"
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
  | "CONTACT_INFO_UPDATE"
  | "OPENING_HOURS_UPDATE"
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
  | "THEME_UPDATE"
  | "THEME_CREATE"
  | "THEME_DELETE";

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
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (err) {
    console.error("[audit] Failed to log event:", err);
  }
}

/** Extract IP from request headers (x-forwarded-for, then x-real-ip) */
export function extractIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip");
}
