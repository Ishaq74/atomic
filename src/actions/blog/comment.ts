import { assertBlogPermission, resolveBlogTenant, assertPostInTenant, auditBlog, blogOrganizationIdSchema, blogPublicRateLimit, invalidateBlogCache } from "./_helpers";
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq, and, isNull } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { blogComments, blogCommentModerations, blogPosts, blogNotifications } from "@database/schemas";
import { sanitizeHtml } from "@/lib/sanitize";
import { blogCommentFormSchema, blogCommentModerationSchema } from "@/lib/blog/validation";
import { extractIp } from "@/lib/audit";

export const createBlogComment = defineAction({
  input: blogCommentFormSchema,
  handler: async (input, context) => {
    blogPublicRateLimit(context, "comment-create", { window: 300, max: 5 });
    const db = getDrizzle();
    const [post] = await db
      .select({ id: blogPosts.id, commentStatus: blogPosts.commentStatus, organizationId: blogPosts.organizationId })
      .from(blogPosts)
      .where(eq(blogPosts.id, input.postId))
      .limit(1);

    if (!post) throw new ActionError({ code: "NOT_FOUND", message: "Article introuvable." });
    if (post.commentStatus === "DISABLED" || post.commentStatus === "CLOSED") {
      throw new ActionError({ code: "FORBIDDEN", message: "Les commentaires sont désactivés pour cet article." });
    }

    const user = context.locals.user;
    const content = sanitizeHtml(input.content);

    const [comment] = await db
      .insert(blogComments)
      .values({
        postId: input.postId,
        authorId: user?.id ?? null,
        parentId: input.parentId,
        guestName: user ? null : input.guestName,
        guestEmail: user ? null : input.guestEmail,
        content,
        status: "PENDING",
        ipAddress: extractIp(context.request.headers, context.clientAddress),
        userAgent: context.request.headers.get("user-agent"),
      })
      .returning();

    // Notify post author
    const [author] = await db
      .select({ authorId: blogPosts.authorId })
      .from(blogPosts)
      .where(eq(blogPosts.id, input.postId))
      .limit(1);

    if (author?.authorId && author.authorId !== user?.id) {
      await db.insert(blogNotifications).values({
        userId: author.authorId,
        type: input.parentId ? "REPLY_TO_COMMENT" : "NEW_COMMENT",
        postId: input.postId,
        commentId: comment.id,
        fromUserId: user?.id ?? null,
        metadata: { content: content.slice(0, 200) },
      });
    }

    invalidateBlogCache();
    return { id: comment.id, status: comment.status };
  },
});

export const moderateBlogComment = defineAction({
  input: blogCommentModerationSchema.extend({
    organizationId: blogOrganizationIdSchema,
  }),
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, { blogComment: ["moderate"] });

    const db = getDrizzle();

    const [comment] = await db
      .select({ id: blogComments.id, postId: blogComments.postId, content: blogComments.content, status: blogComments.status })
      .from(blogComments)
      .innerJoin(blogPosts, eq(blogComments.postId, blogPosts.id))
      .where(
        and(
          eq(blogComments.id, input.commentId),
          tenant.organizationId === null
            ? isNull(blogPosts.organizationId)
            : eq(blogPosts.organizationId, tenant.organizationId),
        ),
      )
      .limit(1);

    if (!comment) throw new ActionError({ code: "NOT_FOUND", message: "Commentaire introuvable." });

    const newStatus =
      input.moderationAction === "APPROVE"
        ? "APPROVED"
        : input.moderationAction === "REJECT"
          ? "REJECTED"
          : input.moderationAction === "DELETE"
            ? "TRASH"
            : input.moderationAction === "RESTORE"
              ? "PENDING"
              : comment.status;

    const newContent = input.moderationAction === "EDIT" && input.content ? sanitizeHtml(input.content) : comment.content;

    await db
      .update(blogComments)
      .set({
        status: newStatus,
        content: newContent,
        isEdited: input.moderationAction === "EDIT",
      })
      .where(eq(blogComments.id, input.commentId));

    await db.insert(blogCommentModerations).values({
      commentId: input.commentId,
      moderatorId: user.id,
      action: input.moderationAction,
      reason: input.reason,
      previousValues: { status: comment.status, content: comment.content },
    });

    // Notify comment author
    const [commentAuthor] = await db
      .select({ authorId: blogComments.authorId })
      .from(blogComments)
      .where(eq(blogComments.id, input.commentId))
      .limit(1);

    if (commentAuthor?.authorId && commentAuthor.authorId !== user.id) {
      await db.insert(blogNotifications).values({
        userId: commentAuthor.authorId,
        type: newStatus === "APPROVED" ? "COMMENT_APPROVED" : "COMMENT_REJECTED",
        postId: comment.postId,
        commentId: comment.id,
        fromUserId: user.id,
      });
    }

    auditBlog(context, user.id, "BLOG_COMMENT_MODERATE", {
      resource: "blog_comments",
      resourceId: input.commentId,
      metadata: { action: input.moderationAction, newStatus },
    });

    invalidateBlogCache();
    return { success: true };
  },
});
