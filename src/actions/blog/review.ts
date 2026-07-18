import { assertBlogPermission, resolveBlogTenant, auditBlog, blogOrganizationIdSchema, blogRateLimit, invalidateBlogCache } from "./_helpers";
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq, and, count, isNull } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { blogPostReviews, blogPostReviewHelpful, blogPosts, blogNotifications } from "@database/schemas";
import { sanitizeHtml } from "@/lib/sanitize";
import { blogReviewFormSchema, blogReviewModerationSchema } from "@/lib/blog/validation";
import { extractIp } from "@/lib/audit";

export const createBlogReview = defineAction({
  input: blogReviewFormSchema,
  handler: async (input, context) => {
    const db = getDrizzle();
    const [post] = await db
      .select({ id: blogPosts.id, allowReviews: blogPosts.allowReviews })
      .from(blogPosts)
      .where(eq(blogPosts.id, input.postId))
      .limit(1);

    if (!post) throw new ActionError({ code: "NOT_FOUND", message: "Article introuvable." });
    if (!post.allowReviews) {
      throw new ActionError({ code: "FORBIDDEN", message: "Les avis sont désactivés pour cet article." });
    }

    const user = context.locals.user;
    if (!user) {
      throw new ActionError({ code: "UNAUTHORIZED", message: "Vous devez être connecté pour laisser un avis." });
    }
    blogRateLimit(context, user.id, "review-create", { window: 3600, max: 10 });

    const content = sanitizeHtml(input.content);

    const [review] = await db
      .insert(blogPostReviews)
      .values({
        postId: input.postId,
        authorId: user.id,
        rating: input.rating,
        title: input.title,
        content,
        isRecommended: input.isRecommended ?? true,
        status: "PENDING",
        ipAddress: extractIp(context.request.headers, context.clientAddress),
      })
      .returning();

    const [author] = await db
      .select({ authorId: blogPosts.authorId })
      .from(blogPosts)
      .where(eq(blogPosts.id, input.postId))
      .limit(1);

    if (author?.authorId && author.authorId !== user.id) {
      await db.insert(blogNotifications).values({
        userId: author.authorId,
        type: "NEW_REVIEW",
        postId: input.postId,
        reviewId: review.id,
        fromUserId: user.id,
        metadata: { rating: input.rating },
      });
    }

    invalidateBlogCache();
    return { id: review.id, status: review.status };
  },
});

export const moderateBlogReview = defineAction({
  input: blogReviewModerationSchema.extend({
    organizationId: blogOrganizationIdSchema,
  }),
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, { blogReview: ["moderate"] });

    const db = getDrizzle();
    const [review] = await db
      .select({ id: blogPostReviews.id, postId: blogPostReviews.postId, authorId: blogPostReviews.authorId })
      .from(blogPostReviews)
      .innerJoin(blogPosts, eq(blogPostReviews.postId, blogPosts.id))
      .where(
        and(
          eq(blogPostReviews.id, input.reviewId),
          tenant.organizationId === null
            ? isNull(blogPosts.organizationId)
            : eq(blogPosts.organizationId, tenant.organizationId),
        ),
      )
      .limit(1);

    if (!review) throw new ActionError({ code: "NOT_FOUND", message: "Avis introuvable." });

    await db
      .update(blogPostReviews)
      .set({ status: input.status })
      .where(eq(blogPostReviews.id, input.reviewId));

    if (review.authorId && review.authorId !== user.id) {
      await db.insert(blogNotifications).values({
        userId: review.authorId,
        type: input.status === "APPROVED" ? "REVIEW_APPROVED" : "COMMENT_REJECTED",
        postId: review.postId,
        reviewId: review.id,
        fromUserId: user.id,
      });
    }

    auditBlog(context, user.id, "BLOG_REVIEW_MODERATE", {
      resource: "blog_post_reviews",
      resourceId: input.reviewId,
      metadata: { status: input.status },
    });

    invalidateBlogCache();
    return { success: true };
  },
});

export const voteBlogReviewHelpful = defineAction({
  input: z.object({
    reviewId: z.uuid(),
    isHelpful: z.boolean(),
  }),
  handler: async (input, context) => {
    const user = context.locals.user;
    if (!user) throw new ActionError({ code: "UNAUTHORIZED", message: "Connexion requise." });

    const db = getDrizzle();
    await db
      .insert(blogPostReviewHelpful)
      .values({ reviewId: input.reviewId, userId: user.id, isHelpful: input.isHelpful })
      .onConflictDoUpdate({
        target: [blogPostReviewHelpful.reviewId, blogPostReviewHelpful.userId],
        set: { isHelpful: input.isHelpful },
      });

    // Recalculate helpful count
    const [{ helpful }] = await db
      .select({ helpful: count() })
      .from(blogPostReviewHelpful)
      .where(and(eq(blogPostReviewHelpful.reviewId, input.reviewId), eq(blogPostReviewHelpful.isHelpful, true)));

    await db
      .update(blogPostReviews)
      .set({ helpfulCount: Number(helpful) })
      .where(eq(blogPostReviews.id, input.reviewId));

    invalidateBlogCache();
    return { success: true };
  },
});
