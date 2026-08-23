import { and, count, eq, isNull, or } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { blogComments, blogPostReviews, blogReports, blogPosts } from "@database/schemas";

function postTenantScope(organizationId: string | null) {
  return organizationId === null ? isNull(blogPosts.organizationId) : eq(blogPosts.organizationId, organizationId);
}

export async function getBlogAdminModerationCount(organizationId: string | null) {
  const db = getDrizzle();
  const commentScope = postTenantScope(organizationId);
  const [comments, reviews, reports] = await Promise.all([
    db
      .select({ count: count() })
      .from(blogComments)
      .innerJoin(blogPosts, eq(blogPosts.id, blogComments.postId))
      .where(and(commentScope, or(eq(blogComments.status, "PENDING"), eq(blogComments.status, "SPAM")))),
    db
      .select({ count: count() })
      .from(blogPostReviews)
      .innerJoin(blogPosts, eq(blogPosts.id, blogPostReviews.postId))
      .where(and(commentScope, eq(blogPostReviews.status, "PENDING"))),
    db
      .select({ count: count() })
      .from(blogReports)
      .leftJoin(blogPosts, eq(blogPosts.id, blogReports.postId))
      .where(and(or(isNull(blogPosts.id), commentScope), eq(blogReports.status, "PENDING"))),
  ]);

  return Number(comments[0]?.count ?? 0) + Number(reviews[0]?.count ?? 0) + Number(reports[0]?.count ?? 0);
}
