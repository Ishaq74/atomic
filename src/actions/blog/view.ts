import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq, sql } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { blogPosts, blogPostViewStats } from "@database/schemas";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractIp } from "@/lib/audit";
import { invalidateBlogCache } from "./_helpers";

type DeviceType = "DESKTOP" | "MOBILE" | "TABLET";

/** Lightweight device-type sniff from User-Agent — no external UA-parser dependency needed. */
function detectDeviceType(userAgent: string | null): DeviceType | undefined {
  if (!userAgent) return undefined;
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/.test(ua)) return "TABLET";
  if (/mobi|iphone|ipod|android/.test(ua)) return "MOBILE";
  return "DESKTOP";
}

/**
 * Records a single public view of a blog post: increments `blogPosts.viewCount`
 * (atomic SQL increment, safe under concurrency) and appends a row to
 * `blogPostViewStats` for the analytics breakdown (date/hour/referrer/device).
 *
 * Called client-side (fire-and-forget) from the public post page — NOT during
 * SSR — so server-side prefetches/crawlers don't inflate counts as much as a
 * render-time increment would. De-duplicated per (post, IP) for 30 minutes via
 * the rate limiter so repeat reloads from the same visitor don't inflate counts.
 */
export const recordBlogPostView = defineAction({
  input: z.object({
    postId: z.string().uuid(),
    referrer: z.string().trim().max(500).optional(),
  }),
  handler: async (input, context) => {
    const db = getDrizzle();
    const [post] = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.id, input.postId))
      .limit(1);

    if (!post) throw new ActionError({ code: "NOT_FOUND", message: "Article introuvable." });

    const ip = extractIp(context.request.headers, context.clientAddress);
    const dedupeKey = ip ? `blog-view:${input.postId}:${ip}` : `blog-view:${input.postId}:__global__`;
    const rl = checkRateLimit(dedupeKey, { window: 1800, max: 1 });
    if (!rl.allowed) {
      // Already counted this visitor for this post in the last 30 minutes.
      return { recorded: false };
    }

    const now = new Date();
    const deviceType = detectDeviceType(context.request.headers.get("user-agent"));

    await db
      .update(blogPosts)
      .set({ viewCount: sql`${blogPosts.viewCount} + 1` })
      .where(eq(blogPosts.id, input.postId));

    await db.insert(blogPostViewStats).values({
      postId: input.postId,
      date: now.toISOString().slice(0, 10),
      hour: now.getUTCHours(),
      referrer: input.referrer?.slice(0, 500),
      deviceType,
      sessionId: context.locals.session?.id ?? null,
    });

    invalidateBlogCache();
    return { recorded: true };
  },
});
