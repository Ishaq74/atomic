import { assertBlogPermission, resolveBlogTenant, auditBlog, blogOrganizationIdSchema, blogPublicRateLimit, invalidateBlogCache } from "./_helpers";
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq, and, desc, isNull, or, exists, sql } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { blogReports, blogComments, blogPostReviews, blogPosts } from "@database/schemas";
import { blogReportFormSchema, blogReportStatusSchema } from "@/lib/blog/validation";

export const createBlogReport = defineAction({
  input: blogReportFormSchema,
  handler: async (input, context) => {
    blogPublicRateLimit(context, "report-create", { window: 600, max: 10 });
    const user = context.locals.user;
    const db = getDrizzle();

    const [report] = await db
      .insert(blogReports)
      .values({
        postId: input.postId ?? null,
        commentId: input.commentId ?? null,
        reviewId: input.reviewId ?? null,
        reporterId: user?.id ?? null,
        reason: input.reason,
        description: input.description,
        status: "PENDING",
      })
      .returning();

    invalidateBlogCache();
    return { id: report.id };
  },
});

export const updateBlogReport = defineAction({
  input: z.object({
    reportId: z.uuid(),
    status: blogReportStatusSchema,
    organizationId: blogOrganizationIdSchema,
  }),
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, { blogComment: ["moderate"] });

    const db = getDrizzle();

    // A report may target a post directly, or a comment/review (postId is null).
    // Resolve the owning post to enforce tenant isolation in both cases.
    const [report] = await db
      .select({
        id: blogReports.id,
        postId: blogReports.postId,
        commentId: blogReports.commentId,
        reviewId: blogReports.reviewId,
      })
      .from(blogReports)
      .where(eq(blogReports.id, input.reportId))
      .limit(1);

    if (!report) throw new ActionError({ code: "NOT_FOUND", message: "Signalement introuvable." });

    const orgFilter =
      tenant.organizationId === null
        ? isNull(blogPosts.organizationId)
        : eq(blogPosts.organizationId, tenant.organizationId);

    let owningPostId: string | null = report.postId;
    if (!owningPostId && report.commentId) {
      const [comment] = await db
        .select({ postId: blogComments.postId })
        .from(blogComments)
        .where(eq(blogComments.id, report.commentId))
        .limit(1);
      owningPostId = comment?.postId ?? null;
    }
    if (!owningPostId && report.reviewId) {
      const [review] = await db
        .select({ postId: blogPostReviews.postId })
        .from(blogPostReviews)
        .where(eq(blogPostReviews.id, report.reviewId))
        .limit(1);
      owningPostId = review?.postId ?? null;
    }

    if (owningPostId) {
      const [post] = await db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(and(eq(blogPosts.id, owningPostId), orgFilter))
        .limit(1);
      if (!post) throw new ActionError({ code: "FORBIDDEN", message: "Ce signalement n'appartient pas à ce tenant." });
    }

    await db
      .update(blogReports)
      .set({ status: input.status, resolvedBy: user.id, resolvedAt: new Date() })
      .where(eq(blogReports.id, input.reportId));

    auditBlog(context, user.id, "BLOG_REPORT_RESOLVE", {
      resource: "blog_reports",
      resourceId: input.reportId,
      metadata: { status: input.status },
    });

    invalidateBlogCache();
    return { success: true };
  },
});

export const getBlogModerationQueue = defineAction({
  input: z.object({
    organizationId: blogOrganizationIdSchema,
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
  }),
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    await assertBlogPermission(context, tenant, { blogComment: ["moderate"] });

    const db = getDrizzle();
    const offset = (input.page - 1) * input.limit;

    const orgFilter = tenant.organizationId === null
      ? isNull(blogPosts.organizationId)
      : eq(blogPosts.organizationId, tenant.organizationId);

    const pendingComments = await db
      .select({
        comment: blogComments,
        post: { id: blogPosts.id, slug: blogPosts.slug },
      })
      .from(blogComments)
      .innerJoin(blogPosts, eq(blogComments.postId, blogPosts.id))
      .where(and(eq(blogComments.status, "PENDING"), orgFilter))
      .orderBy(desc(blogComments.createdAt))
      .limit(input.limit)
      .offset(offset);

    const pendingReviews = await db
      .select({
        review: blogPostReviews,
        post: { id: blogPosts.id, slug: blogPosts.slug },
      })
      .from(blogPostReviews)
      .innerJoin(blogPosts, eq(blogPostReviews.postId, blogPosts.id))
      .where(and(eq(blogPostReviews.status, "PENDING"), orgFilter))
      .orderBy(desc(blogPostReviews.createdAt))
      .limit(input.limit)
      .offset(offset);

    // Reports may target a post directly, or a comment/review (postId null).
    // A report belongs to the tenant if its owning post (direct, via comment,
    // or via review) matches the tenant org filter.
    const reportInTenant = or(
      and(
        sql`${blogReports.postId} IS NOT NULL`,
        exists(
          db
            .select({ one: sql`1` })
            .from(blogPosts)
            .where(and(eq(blogPosts.id, blogReports.postId), orgFilter)),
        ),
      ),
      and(
        sql`${blogReports.commentId} IS NOT NULL`,
        exists(
          db
            .select({ one: sql`1` })
            .from(blogComments)
            .innerJoin(blogPosts, eq(blogPosts.id, blogComments.postId))
            .where(and(eq(blogComments.id, blogReports.commentId), orgFilter)),
        ),
      ),
      and(
        sql`${blogReports.reviewId} IS NOT NULL`,
        exists(
          db
            .select({ one: sql`1` })
            .from(blogPostReviews)
            .innerJoin(blogPosts, eq(blogPosts.id, blogPostReviews.postId))
            .where(and(eq(blogPostReviews.id, blogReports.reviewId), orgFilter)),
        ),
      ),
    );

    const pendingReports = await db
      .select({
        report: blogReports,
        post: { id: blogPosts.id, slug: blogPosts.slug },
      })
      .from(blogReports)
      .innerJoin(blogPosts, eq(blogReports.postId, blogPosts.id))
      .where(and(eq(blogReports.status, "PENDING"), reportInTenant))
      .orderBy(desc(blogReports.createdAt))
      .limit(input.limit)
      .offset(offset);

    return { comments: pendingComments, reviews: pendingReviews, reports: pendingReports };
  },
});
