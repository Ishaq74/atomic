import { blogRateLimit, invalidateBlogCache } from "./_helpers";
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq, and, count } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { blogPostReactions, blogPostFavorites, blogPosts } from "@database/schemas";
import { blogReactionFormSchema } from "@/lib/blog/validation";

export const toggleBlogReaction = defineAction({
  input: blogReactionFormSchema,
  handler: async (input, context) => {
    const user = context.locals.user;
    if (!user) throw new ActionError({ code: "UNAUTHORIZED", message: "Connexion requise." });
    blogRateLimit(context, user.id, "reaction-toggle", { window: 60, max: 60 });

    const db = getDrizzle();
    const [post] = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.id, input.postId))
      .limit(1);
    if (!post) throw new ActionError({ code: "NOT_FOUND", message: "Article introuvable." });

    const [existing] = await db
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
      await db
        .delete(blogPostReactions)
        .where(
          and(
            eq(blogPostReactions.postId, input.postId),
            eq(blogPostReactions.userId, user.id),
            eq(blogPostReactions.reactionType, input.reactionType),
          ),
        );
    } else {
      await db.insert(blogPostReactions).values({
        postId: input.postId,
        userId: user.id,
        reactionType: input.reactionType,
      });
    }

    const [{ value }] = await db
      .select({ value: count() })
      .from(blogPostReactions)
      .where(
        and(
          eq(blogPostReactions.postId, input.postId),
          eq(blogPostReactions.reactionType, input.reactionType),
        ),
      );

    invalidateBlogCache();
    return { active: !existing, count: Number(value) };
  },
});

export const toggleBlogFavorite = defineAction({
  input: z.object({ postId: z.string().uuid() }),
  handler: async (input, context) => {
    const user = context.locals.user;
    if (!user) throw new ActionError({ code: "UNAUTHORIZED", message: "Connexion requise." });
    blogRateLimit(context, user.id, "favorite-toggle", { window: 60, max: 60 });

    const db = getDrizzle();
    const [existing] = await db
      .select()
      .from(blogPostFavorites)
      .where(and(eq(blogPostFavorites.postId, input.postId), eq(blogPostFavorites.userId, user.id)))
      .limit(1);

    if (existing) {
      await db
        .delete(blogPostFavorites)
        .where(and(eq(blogPostFavorites.postId, input.postId), eq(blogPostFavorites.userId, user.id)));
    } else {
      await db.insert(blogPostFavorites).values({ postId: input.postId, userId: user.id });
    }

    const [{ value }] = await db
      .select({ value: count() })
      .from(blogPostFavorites)
      .where(eq(blogPostFavorites.postId, input.postId));

    invalidateBlogCache();
    return { active: !existing, count: Number(value) };
  },
});
