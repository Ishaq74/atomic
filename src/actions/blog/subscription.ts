import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { ActionError } from "astro:actions";
import { and, eq, isNull } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { blogSubscribers } from "@database/schemas";
import { blogPublicRateLimit } from "./_helpers";
import { sendEmail } from "@/smtp/send";
import { blogNewsletterConfirmTemplate, blogNewsletterUnsubscribeTemplate } from "@/smtp/templates/blog-newsletter";
import { logAuditEvent } from "@/lib/audit";
import { LOCALES } from "@i18n/config";
import type { Locale } from "@i18n/config";

const blogSubscriptionSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide"),
  locale: z.enum(LOCALES),
  organizationId: z.string().trim().min(1).optional().nullable(),
});

const blogTokenSchema = z.object({
  token: z.string().trim().min(1),
});

/**
 * Double opt-in subscription. Inserts a PENDING subscriber with a unique token
 * and sends a confirmation email. Idempotent: re-subscribing an existing email
 * (even if previously unsubscribed) re-sends the confirmation and resets to PENDING.
 */
export const subscribeBlogNewsletter = defineAction({
  input: blogSubscriptionSchema,
  handler: async (input, context) => {
    blogPublicRateLimit(context, "newsletter-subscribe", { window: 3600, max: 10 });

    const db = getDrizzle();
    const token = crypto.randomUUID();

    const orgCondition = input.organizationId
      ? eq(blogSubscribers.organizationId, input.organizationId)
      : isNull(blogSubscribers.organizationId);

    const existing = await db
      .select({ id: blogSubscribers.id, status: blogSubscribers.status })
      .from(blogSubscribers)
      .where(and(eq(blogSubscribers.email, input.email), orgCondition))
      .limit(1);

    const baseUrl = new URL(context.request.url).origin;
    const confirmUrl = `${baseUrl}/api/blog/newsletter/confirm?token=${encodeURIComponent(token)}`;
    const unsubscribeUrl = `${baseUrl}/api/blog/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;

    const template = blogNewsletterConfirmTemplate({
      locale: input.locale as Locale,
      confirmUrl,
      unsubscribeUrl,
    });

    if (existing.length > 0) {
      await db
        .update(blogSubscribers)
        .set({ token, status: "PENDING", locale: input.locale, updatedAt: new Date() })
        .where(eq(blogSubscribers.id, existing[0].id));
    } else {
      await db.insert(blogSubscribers).values({
        email: input.email,
        locale: input.locale,
        token,
        organizationId: input.organizationId ?? null,
        status: "PENDING",
      });
    }

    try {
      await sendEmail({
        to: input.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    } catch {
      // Do not leak email delivery failures to the client.
    }

    await logAuditEvent({
      userId: "system",
      action: "BLOG_NEWSLETTER_SUBSCRIBE",
      resource: "blogSubscriber",
      metadata: { email: input.email, organizationId: input.organizationId ?? null },
    });

    return { success: true };
  },
});

/**
 * Confirms a pending subscription via its token. Returns success even if the
 * token is unknown or already confirmed (to avoid leaking subscriber state).
 */
export const confirmBlogSubscription = defineAction({
  input: blogTokenSchema,
  handler: async (input, context) => {
    const db = getDrizzle();

    const subscriber = await db
      .select()
      .from(blogSubscribers)
      .where(eq(blogSubscribers.token, input.token))
      .limit(1);

    if (subscriber.length > 0 && subscriber[0].status !== "CONFIRMED") {
      await db
        .update(blogSubscribers)
        .set({ status: "CONFIRMED", confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(blogSubscribers.token, input.token));

      await logAuditEvent({
        userId: "system",
        action: "BLOG_NEWSLETTER_CONFIRM",
        resource: "blogSubscriber",
        resourceId: subscriber[0].id,
      });
    }

    return { success: true };
  },
});

/**
 * Unsubscribes a confirmed subscriber via its token.
 */
export const unsubscribeBlogNewsletter = defineAction({
  input: blogTokenSchema,
  handler: async (input, context) => {
    const db = getDrizzle();

    const subscriber = await db
      .select()
      .from(blogSubscribers)
      .where(eq(blogSubscribers.token, input.token))
      .limit(1);

    if (subscriber.length > 0 && subscriber[0].status !== "UNSUBSCRIBED") {
      await db
        .update(blogSubscribers)
        .set({ status: "UNSUBSCRIBED", unsubscribedAt: new Date(), updatedAt: new Date() })
        .where(eq(blogSubscribers.token, input.token));

      await logAuditEvent({
        userId: "system",
        action: "BLOG_NEWSLETTER_UNSUBSCRIBE",
        resource: "blogSubscriber",
        resourceId: subscriber[0].id,
      });
    }

    return { success: true };
  },
});

export { blogSubscriptionSchema };
