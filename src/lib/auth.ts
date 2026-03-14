import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDrizzle, schema } from "@database/drizzle";
import { username, admin, organization, testUtils } from "better-auth/plugins";

const isTest = process.env.NODE_ENV === 'test';
import { type Locale, LOCALES, DEFAULT_LOCALE } from "@i18n/config";
import { verifyEmailTemplate } from "@smtp/templates/verify-email";
import { resetPasswordTemplate } from "@smtp/templates/reset-password";
import { deleteAccountTemplate } from "@smtp/templates/delete-account";
import { organizationInvitationTemplate } from "@smtp/templates/organization-invitation";
import { deleteUpload } from "@/media/delete";
import { logAuditEvent, extractIp, type AuditAction } from "@/lib/audit";

/** Extract locale from a callback URL like https://…/{locale}/auth/… */
function extractLocale(url: string): Locale {
  try {
    const { pathname } = new URL(url);
    const segment = pathname.split("/").filter(Boolean)[0];
    if (segment && (LOCALES as readonly string[]).includes(segment)) {
      return segment as Locale;
    }
  } catch { /* malformed url – fall through */ }
  return DEFAULT_LOCALE;
}

export const auth = betterAuth({
  database: drizzleAdapter(getDrizzle(), {
    provider: "pg",
    schema,
  }),
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 10, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/forget-password": { window: 60, max: 3 },
      "/reset-password/*": { window: 60, max: 5 },
      "/change-password": { window: 60, max: 5 },
      "/delete-user/*": { window: 60, max: 2 },
      "/organization/create": { window: 60, max: 5 },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const locale = extractLocale(url);
      const { subject, html, text } = resetPasswordTemplate({
        locale,
        userName: user.name,
        resetUrl: url,
      });
      if (!isTest) import("@smtp/send").then(m => m.sendEmail({ to: user.email, subject, html, text })).catch(err => console.error('[SMTP] Reset password email failed:', err));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const locale = extractLocale(url);
      const { subject, html, text } = verifyEmailTemplate({
        locale,
        userName: user.name,
        verificationUrl: url,
      });
      if (!isTest) import("@smtp/send").then(m => m.sendEmail({ to: user.email, subject, html, text })).catch(err => console.error('[SMTP] Verification email failed:', err));
    },
  },
  user: {
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        const locale = extractLocale(url);
        const { subject, html, text } = deleteAccountTemplate({
          locale,
          userName: user.name,
          deleteUrl: url,
        });
        if (!isTest) import("@smtp/send").then(m => m.sendEmail({ to: user.email, subject, html, text })).catch(err => console.error('[SMTP] Delete account email failed:', err));
      },
      beforeDelete: async (user) => {
        if (user.image?.startsWith('/uploads/')) {
          try {
            await deleteUpload(user.image);
          } catch { /* file may already be gone */ }
        }
      },
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Map better-auth paths to audit actions
      const pathActionMap: Record<string, { action: AuditAction; resource: string }> = {
        "/sign-in/email": { action: "SIGN_IN", resource: "session" },
        "/sign-up/email": { action: "SIGN_UP", resource: "user" },
        "/sign-out": { action: "SIGN_OUT", resource: "session" },
        "/change-password": { action: "PASSWORD_CHANGE", resource: "user" },
        "/forget-password": { action: "PASSWORD_RESET_REQUEST", resource: "user" },
        "/reset-password": { action: "PASSWORD_RESET_COMPLETE", resource: "user" },
        "/update-user": { action: "USER_UPDATE", resource: "user" },
        "/delete-user": { action: "USER_DELETE", resource: "user" },
        "/admin/ban-user": { action: "USER_BAN", resource: "user" },
        "/admin/unban-user": { action: "USER_UNBAN", resource: "user" },
        "/admin/set-role": { action: "USER_ROLE_CHANGE", resource: "user" },
        "/admin/impersonate-user": { action: "IMPERSONATION_START", resource: "session" },
        "/admin/stop-impersonating": { action: "IMPERSONATION_STOP", resource: "session" },
        "/admin/remove-user": { action: "USER_DELETE", resource: "user" },
        "/organization/create": { action: "ORG_CREATE", resource: "organization" },
        "/organization/update": { action: "ORG_UPDATE", resource: "organization" },
        "/organization/delete": { action: "ORG_DELETE", resource: "organization" },
        "/organization/invite-member": { action: "ORG_INVITATION_SEND", resource: "invitation" },
        "/organization/accept-invitation": { action: "ORG_INVITATION_ACCEPT", resource: "invitation" },
        "/organization/reject-invitation": { action: "ORG_INVITATION_REJECT", resource: "invitation" },
        "/organization/cancel-invitation": { action: "ORG_INVITATION_CANCEL", resource: "invitation" },
        "/organization/remove-member": { action: "ORG_MEMBER_REMOVE", resource: "member" },
        "/organization/update-member-role": { action: "ORG_MEMBER_ROLE_CHANGE", resource: "member" },
      };

      const mapping = pathActionMap[ctx.path];
      if (!mapping) return;

      // Only log successful responses (not errors)
      const returned = ctx.context.returned;
      if (returned instanceof Error) return;

      const userId = ctx.context.newSession?.user?.id
        ?? ctx.body?.userId
        ?? ctx.context.session?.user?.id
        ?? null;

      const ip = ctx.headers ? extractIp(ctx.headers) : null;
      const ua = ctx.headers?.get("user-agent") ?? null;

      // Build metadata from body — whitelist safe fields only
      const SAFE_FIELDS = new Set(['userId', 'organizationId', 'memberId', 'invitationId', 'role', 'name', 'email', 'slug', 'username']);
      const body: Record<string, unknown> = {};
      if (ctx.body) {
        for (const [key, value] of Object.entries(ctx.body)) {
          if (SAFE_FIELDS.has(key)) body[key] = value;
        }
      }

      ctx.context.runInBackground(
        logAuditEvent({
          userId,
          action: mapping.action,
          resource: mapping.resource,
          resourceId: (body.organizationId ?? body.memberId ?? body.invitationId ?? body.userId ?? null) as string | null,
          metadata: Object.keys(body).length > 0 ? body : null,
          ipAddress: ip,
          userAgent: ua,
        }),
      );
    }),
  },
  plugins: [
    username(),
    admin(),
    organization({
      async sendInvitationEmail(data) {
        const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:4321';
        const inviteUrl = `${baseUrl}/${DEFAULT_LOCALE}/auth/${DEFAULT_LOCALE === 'fr' ? 'organisations' : 'organizations'}?invitation=${data.id}`;
        const { subject, html, text } = organizationInvitationTemplate({
          locale: DEFAULT_LOCALE,
          inviterName: data.inviter.user.name,
          orgName: data.organization.name,
          role: data.role ?? 'member',
          inviteUrl,
        });
        if (!isTest) import("@smtp/send").then(m => m.sendEmail({ to: data.email, subject, html, text })).catch(err => console.error('[SMTP] Organization invitation email failed:', err));
      },
      organizationHooks: {
        beforeDeleteOrganization: async (data) => {
          const org = data.organization;
          if (org.logo?.startsWith('/uploads/')) {
            try {
              await deleteUpload(org.logo);
            } catch { /* file may already be gone */ }
          }
        },
      },
    }),
    ...(isTest ? [testUtils()] : []),
  ],
});
