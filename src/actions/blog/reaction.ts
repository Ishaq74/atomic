import { blogRateLimit, invalidateBlogCache, auditBlog } from "./_helpers";
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq, and, count } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { blogPostReactions, blogPostFavorites, blogPosts } from "@database/schemas";
import { blogReactionFormSchema } from "@/lib/blog/validation";
import { publicBlogPostScope } from "@/lib/blog/public-visibility";

export const toggleBlogReaction = defineAction({
  input: blogReactionFormSchema,
  handler: async (input, context) => {
    const user = context.locals.user;
    if (!user) throw new ActionError({ code: "UNAUTHORIZED", message: "Connexion requise." });
    blogRateLimit(context, user.id, "reaction-toggle", { window: 60, max: 60 });

    const db = getDrizzle();

    // Run the toggle + the recount inside a single transaction so the count
    // is read under the same isolation snapshot as the write (no read-after-write
    // race under concurrent toggles from different users on the same post).
    const { active, count: total } = await db.transaction(async (tx) => {
      const [post] = await tx
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(and(eq(blogPosts.id, input.postId), publicBlogPostScope(blogPosts)))
        .limit(1);
      if (!post) throw new ActionError({ code: "NOT_FOUND", message: "Article introuvable." });

      const [existing] = await tx
        .select()
        .from(blogPostReactions)
        .where(
          and(
            eq(blogPostReactions.postId, input.postId),
            eq(blogPostReactions.userId, user.id),
            eq(blogPostReactions.reactionType, input.reactionType),
          ),
        )
        .limit(1);

      if (existing) {
        await tx
          .delete(blogPostReactions)
          .where(
            and(
              eq(blogPostReactions.postId, input.postId),
              eq(blogPostReactions.userId, user.id),
              eq(blogPostReactions.reactionType, input.reactionType),
            ),
          );
      } else {
        await tx.insert(blogPostReactions).values({
          postId: input.postId,
          userId: user.id,
          reactionType: input.reactionType,
        });
      }

      const [{ value }] = await tx
        .select({ value: count() })
        .from(blogPostReactions)
        .where(
          and(
            eq(blogPostReactions.postId, input.postId),
            eq(blogPostReactions.reactionType, input.reactionType),
          ),
        );

      return { active: !existing, count: Number(value) };
    });

    invalidateBlogCache();
    auditBlog(context, user.id, active ? "BLOG_REACTION_ADD" : "BLOG_REACTION_REMOVE", {
      resource: "blog_post_reactions",
      resourceId: input.postId,
      metadata: { reactionType: input.reactionType },
    });
    return { active, count: total };
  },
});

export const toggleBlogFavorite = defineAction({
  input: z.object({ postId: z.uuid() }),
  handler: async (input, context) => {
    const user = context.locals.user;
    if (!user) throw new ActionError({ code: "UNAUTHORIZED", message: "Connexion requise." });
    blogRateLimit(context, user.id, "favorite-toggle", { window: 60, max: 60 });

    const db = getDrizzle();

    // Same transactional isolation as toggleBlogReaction: write + recount in
    // one snapshot so concurrent favorites can't desync the returned count.
    const { active, count: total } = await db.transaction(async (tx) => {
      const [post] = await tx
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(and(eq(blogPosts.id, input.postId), publicBlogPostScope(blogPosts)))
        .limit(1);
      if (!post) throw new ActionError({ code: "NOT_FOUND", message: "Article introuvable." });

      const [existing] = await tx
        .select()
        .from(blogPostFavorites)
        .where(and(eq(blogPostFavorites.postId, input.postId), eq(blogPostFavorites.userId, user.id)))
        .limit(1);

      if (existing) {
        await tx
          .delete(blogPostFavorites)
          .where(and(eq(blogPostFavorites.postId, input.postId), eq(blogPostFavorites.userId, user.id)));
      } else {
        await tx.insert(blogPostFavorites).values({ postId: input.postId, userId: user.id });
      }

      const [{ value }] = await tx
        .select({ value: count() })
        .from(blogPostFavorites)
        .where(eq(blogPostFavorites.postId, input.postId));

      return { active: !existing, count: Number(value) };
    });

    invalidateBlogCache();
    auditBlog(context, user.id, active ? "BLOG_FAVORITE_ADD" : "BLOG_FAVORITE_REMOVE", {
      resource: "blog_post_favorites",
      resourceId: input.postId,
    });
    return { active, count: total };
  },
});
