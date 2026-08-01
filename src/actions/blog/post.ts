import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq, and, desc, isNull, ne } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import {
  blogPosts,
  blogPostTranslations,
  blogPostCategories,
  blogPostTags,
  blogPostRevisions,
  blogPostSeo,
  blogPostLocks,
} from "@database/schemas";
import { sanitizeHtml } from "@/lib/sanitize";
import { LOCALES } from "@i18n/config";
import {
  blogPostFormSchema,
  blogPostUpdateSchema,
  calculateSeoScore,
} from "@/lib/blog/validation";
import { generateExcerpt, getOgLocale } from "@/lib/blog/utils";
import { BLOG_DEFAULTS, type BlogPostStatus } from "@/lib/blog/constants";
import {
  assertBlogPermission,
  resolveBlogTenant,
  assertPostInTenant,
  assertCategoryInTenant,
  assertTagInTenant,
  assertMediaInTenant,
  blogRateLimit,
  auditBlog,
  invalidateBlogCache,
  blogOrganizationIdSchema,
} from "./_helpers";

function toRevisionStatus(status: BlogPostStatus | undefined): "DRAFT" | "PUBLISHED" | "ARCHIVED" {
  if (status === "PUBLISHED" || status === "ARCHIVED") return status;
  if (status === "DELETED") return "ARCHIVED";
  return "DRAFT";
}

export const createBlogPost = defineAction({
  input: blogPostFormSchema.extend({
    organizationId: blogOrganizationIdSchema,
  }),
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, {
      blog: input.status === "PUBLISHED" ? ["create", "publish"] : ["create"],
    });
    blogRateLimit(context, user.id, "post-create");

    const db = getDrizzle();
    await Promise.all([
      ...(input.categoryIds ?? []).map((categoryId) => assertCategoryInTenant(categoryId, tenant)),
      ...(input.tagIds ?? []).map((tagId) => assertTagInTenant(tagId, tenant)),
      ...(input.featuredImageId ? [assertMediaInTenant(input.featuredImageId, tenant)] : []),
      ...(input.ogImageId ? [assertMediaInTenant(input.ogImageId, tenant)] : []),
    ]);

    const now = new Date();
    const publishedAt = input.status === "PUBLISHED" ? (input.publishedAt ?? now) : null;

    const content = sanitizeHtml(input.content);
    const excerpt = input.excerpt?.trim() || generateExcerpt(content);
    const seoScore = calculateSeoScore({
      title: input.title,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      content,
      focusKeyword: input.seo?.focusKeyword,
    });

    let post: typeof blogPosts.$inferSelect;
    try {
      post = await db.transaction(async (tx) => {
        const [createdPost] = await tx
          .insert(blogPosts)
          .values({
            organizationId: tenant.organizationId,
            authorId: user.id,
            slug: input.slug,
            status: input.status,
            featuredImageId: input.featuredImageId,
            isFeatured: input.isFeatured ?? false,
            isSticky: input.isSticky ?? false,
            commentStatus: input.commentStatus ?? "OPEN",
            allowReviews: input.allowReviews ?? true,
            seoScore,
            publishedAt,
            updatedBy: user.id,
          })
          .returning();

        await tx.insert(blogPostTranslations).values({
          postId: createdPost.id,
          organizationId: tenant.organizationId,
          locale: input.locale,
          title: input.title,
          slug: input.slug,
          content,
          excerpt,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          metaKeywords: input.metaKeywords,
          canonicalUrl: input.canonicalUrl,
          ogTitle: input.ogTitle,
          ogDescription: input.ogDescription,
          ogImageId: input.ogImageId,
        });

        if (input.categoryIds?.length) {
          await tx.insert(blogPostCategories).values(
            input.categoryIds.map((categoryId) => ({ postId: createdPost.id, categoryId })),
          );
        }

        if (input.tagIds?.length) {
          await tx.insert(blogPostTags).values(
            input.tagIds.map((tagId) => ({ postId: createdPost.id, tagId })),
          );
        }

        if (input.seo) {
          await tx.insert(blogPostSeo).values({
            postId: createdPost.id,
            locale: input.locale,
            focusKeyword: input.seo.focusKeyword,
            focusKeywordScore: seoScore,
            metaRobots: input.seo.metaRobots,
            metaOgType: input.seo.metaOgType,
            metaOgLocale: getOgLocale(input.locale),
            metaTwitterCard: input.seo.metaTwitterCard,
            schemaMarkup: input.seo.schemaMarkup,
          });
        }

        await tx.insert(blogPostRevisions).values({
          postId: createdPost.id,
          authorId: user.id,
          locale: input.locale,
          title: input.title,
          slug: input.slug,
          content,
          excerpt,
          status: toRevisionStatus(input.status),
          revisionNote: "Création initiale",
        });

        return createdPost;
      });
    } catch (err) {
      // Both slug constraints are covered by the aggregate transaction.
      if (err instanceof Error && /duplicate|unique/i.test(err.message)) {
        throw new ActionError({
          code: "CONFLICT",
          message: "Un article avec ce slug existe déjà pour ce tenant/locale.",
        });
      }
      throw err;
    }

    auditBlog(context, user.id, "BLOG_POST_CREATE", {
      resource: "blog_posts",
      resourceId: post.id,
      metadata: { organizationId: tenant.organizationId, locale: input.locale, slug: input.slug },
    });

    invalidateBlogCache();
    return { id: post.id, slug: input.slug };
  },
});

export const updateBlogPost = defineAction({
  input: blogPostUpdateSchema.extend({
    organizationId: blogOrganizationIdSchema,
    categoryIds: z.array(z.uuid()).max(10).optional(),
    tagIds: z.array(z.uuid()).max(20).optional(),
  }),
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, { blog: ["update"] });
    blogRateLimit(context, user.id, "post-update");

    const { id, organizationId: _, categoryIds, tagIds, seo, ...data } = input;
    const existingPost = await assertPostInTenant(id, tenant);
    if (data.status === "PUBLISHED" && existingPost.status !== "PUBLISHED") {
      await assertBlogPermission(context, tenant, { blog: ["publish"] });
    }
    await Promise.all([
      ...(categoryIds ?? []).map((categoryId) => assertCategoryInTenant(categoryId, tenant)),
      ...(tagIds ?? []).map((tagId) => assertTagInTenant(tagId, tenant)),
      ...(data.featuredImageId ? [assertMediaInTenant(data.featuredImageId, tenant)] : []),
      ...(data.ogImageId ? [assertMediaInTenant(data.ogImageId, tenant)] : []),
    ]);

    const db = getDrizzle();

    // Check lock
    const [lock] = await db
      .select()
      .from(blogPostLocks)
      .where(eq(blogPostLocks.postId, id))
      .limit(1);
    if (lock && lock.userId !== user.id && lock.expiresAt > new Date()) {
      throw new ActionError({
        code: "CONFLICT",
        message: "Cet article est en cours d'édition par un autre utilisateur.",
      });
    }

    const locale = input.locale;
    const existingTranslation = locale
      ? await db
          .select()
          .from(blogPostTranslations)
          .where(and(eq(blogPostTranslations.postId, id), eq(blogPostTranslations.locale, locale)))
          .limit(1)
          .then((r) => r[0])
      : null;

    if (
      existingTranslation
      && (existingTranslation.organizationId ?? null) !== tenant.organizationId
    ) {
      throw new ActionError({
        code: "FORBIDDEN",
        message: "Cette traduction n'appartient pas au même tenant que son article.",
      });
    }

    // Pre-check slug uniqueness before any write so a duplicate slug surfaces
    // as a clean 4xx instead of a raw 500 from the unique index.
    const isCanonicalLocale = locale === LOCALES[0];
    if (data.slug) {
      if (isCanonicalLocale) {
        const orgCond = tenant.organizationId === null
          ? isNull(blogPosts.organizationId)
          : eq(blogPosts.organizationId, tenant.organizationId);
        const [dupPost] = await db
          .select({ id: blogPosts.id })
          .from(blogPosts)
          .where(and(eq(blogPosts.slug, data.slug), orgCond, ne(blogPosts.id, id)))
          .limit(1);
        if (dupPost) {
          throw new ActionError({
            code: "CONFLICT",
            message: "Un article avec ce slug existe déjà pour ce tenant.",
          });
        }
      }
      if (locale) {
        const transOrgCond = tenant.organizationId === null
          ? isNull(blogPostTranslations.organizationId)
          : eq(blogPostTranslations.organizationId, tenant.organizationId);
        const translationConditions = [
          eq(blogPostTranslations.slug, data.slug),
          eq(blogPostTranslations.locale, locale),
          transOrgCond,
          ...(existingTranslation ? [ne(blogPostTranslations.id, existingTranslation.id)] : []),
        ];
        const [dupTrans] = await db
          .select({ id: blogPostTranslations.id })
          .from(blogPostTranslations)
          .where(and(...translationConditions))
          .limit(1);
        if (dupTrans) {
          throw new ActionError({
            code: "CONFLICT",
            message: "Une traduction avec ce slug existe déjà pour cette locale/tenant.",
          });
        }
      }
    }

    const content = data.content ? sanitizeHtml(data.content) : undefined;
    const excerpt = data.excerpt?.trim() || (content ? generateExcerpt(content) : undefined);

    const seoScore = calculateSeoScore({
      title: data.title ?? existingTranslation?.title ?? "",
      metaTitle: data.metaTitle ?? existingTranslation?.metaTitle ?? undefined,
      metaDescription: data.metaDescription ?? existingTranslation?.metaDescription ?? undefined,
      content: content ?? existingTranslation?.content ?? "",
      focusKeyword: seo?.focusKeyword,
    });

    const publishedAt = data.status === "PUBLISHED"
      ? (data.publishedAt ?? new Date())
      : data.status === "DRAFT"
        ? null
        : undefined;

    if (locale && !existingTranslation && (!data.title || !data.slug || !content)) {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "Le titre, le slug et le contenu sont requis pour une nouvelle traduction.",
      });
    }

    try {
      await db.transaction(async (tx) => {
        await tx
          .update(blogPosts)
          .set({
            ...(isCanonicalLocale && data.slug !== undefined ? { slug: data.slug } : {}),
            status: data.status,
            featuredImageId: data.featuredImageId,
            isFeatured: data.isFeatured,
            isSticky: data.isSticky,
            commentStatus: data.commentStatus,
            allowReviews: data.allowReviews,
            seoScore,
            publishedAt,
            updatedBy: user.id,
          })
          .where(eq(blogPosts.id, id));

        if (locale) {
          if (existingTranslation) {
            await tx
              .update(blogPostTranslations)
              .set({
                title: data.title,
                slug: data.slug,
                content,
                excerpt,
                metaTitle: data.metaTitle,
                metaDescription: data.metaDescription,
                metaKeywords: data.metaKeywords,
                canonicalUrl: data.canonicalUrl,
                ogTitle: data.ogTitle,
                ogDescription: data.ogDescription,
                ogImageId: data.ogImageId,
              })
              .where(eq(blogPostTranslations.id, existingTranslation.id));
          } else {
            await tx.insert(blogPostTranslations).values({
              postId: id,
              organizationId: tenant.organizationId,
              locale,
              title: data.title!,
              slug: data.slug!,
              content: content!,
              excerpt,
              metaTitle: data.metaTitle,
              metaDescription: data.metaDescription,
              metaKeywords: data.metaKeywords,
              canonicalUrl: data.canonicalUrl,
              ogTitle: data.ogTitle,
              ogDescription: data.ogDescription,
              ogImageId: data.ogImageId,
            });
          }
        }

        if (categoryIds !== undefined) {
          await tx.delete(blogPostCategories).where(eq(blogPostCategories.postId, id));
          if (categoryIds.length) {
            await tx.insert(blogPostCategories).values(
              categoryIds.map((categoryId) => ({ postId: id, categoryId })),
            );
          }
        }

        if (tagIds !== undefined) {
          await tx.delete(blogPostTags).where(eq(blogPostTags.postId, id));
          if (tagIds.length) {
            await tx.insert(blogPostTags).values(tagIds.map((tagId) => ({ postId: id, tagId })));
          }
        }

        if (seo && locale) {
          const [existingSeo] = await tx
            .select()
            .from(blogPostSeo)
            .where(and(eq(blogPostSeo.postId, id), eq(blogPostSeo.locale, locale)))
            .limit(1);

          const seoValues = {
            focusKeyword: seo.focusKeyword,
            focusKeywordScore: seoScore,
            metaRobots: seo.metaRobots,
            metaOgType: seo.metaOgType,
            metaOgLocale: getOgLocale(locale),
            metaTwitterCard: seo.metaTwitterCard,
            schemaMarkup: seo.schemaMarkup,
          };

          if (existingSeo) {
            await tx.update(blogPostSeo).set(seoValues).where(eq(blogPostSeo.id, existingSeo.id));
          } else {
            await tx.insert(blogPostSeo).values({ postId: id, locale, ...seoValues });
          }
        }

        await tx.insert(blogPostRevisions).values({
          postId: id,
          authorId: user.id,
          locale: locale ?? existingTranslation?.locale ?? LOCALES[0],
          title: data.title ?? existingTranslation?.title ?? "",
          slug: data.slug ?? existingTranslation?.slug ?? "",
          content: content ?? existingTranslation?.content ?? "",
          excerpt,
          status: data.status
            ? toRevisionStatus(data.status)
            : existingTranslation
              ? "PUBLISHED"
              : "DRAFT",
          revisionNote: "Mise à jour",
        });
      });
    } catch (err) {
      if (err instanceof Error && /duplicate|unique/i.test(err.message)) {
        throw new ActionError({
          code: "CONFLICT",
          message: "Un article avec ce slug existe déjà pour ce tenant/locale.",
        });
      }
      throw err;
    }

    auditBlog(context, user.id, "BLOG_POST_UPDATE", {
      resource: "blog_posts",
      resourceId: id,
      metadata: { organizationId: tenant.organizationId },
    });

    invalidateBlogCache();
    return { id };
  },
});

export const deleteBlogPost = defineAction({
  input: z.object({
    id: z.uuid(),
    organizationId: blogOrganizationIdSchema,
    permanent: z.boolean().default(false),
  }),
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, { blog: ["delete"] });
    blogRateLimit(context, user.id, "post-delete");

    await assertPostInTenant(input.id, tenant);
    const db = getDrizzle();

    if (input.permanent) {
      await db.delete(blogPosts).where(eq(blogPosts.id, input.id));
    } else {
      await db
        .update(blogPosts)
        .set({ status: "DELETED", updatedBy: user.id })
        .where(eq(blogPosts.id, input.id));
    }

    auditBlog(context, user.id, input.permanent ? "BLOG_POST_DELETE" : "BLOG_POST_ARCHIVE", {
      resource: "blog_posts",
      resourceId: input.id,
      metadata: { organizationId: tenant.organizationId, permanent: input.permanent },
    });

    invalidateBlogCache();
    return { success: true };
  },
});

export const publishBlogPost = defineAction({
  input: z.object({
    id: z.uuid(),
    organizationId: blogOrganizationIdSchema,
  }),
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, { blog: ["publish"] });
    await assertPostInTenant(input.id, tenant);

    const db = getDrizzle();
    await db.transaction(async (tx) => {
      await tx
        .update(blogPosts)
        .set({ status: "PUBLISHED", publishedAt: new Date(), updatedBy: user.id })
        .where(eq(blogPosts.id, input.id));
    });

    auditBlog(context, user.id, "BLOG_POST_PUBLISH", {
      resource: "blog_posts",
      resourceId: input.id,
      metadata: { organizationId: tenant.organizationId },
    });

    invalidateBlogCache();
    return { success: true };
  },
});

export const lockBlogPost = defineAction({
  input: z.object({
    id: z.uuid(),
    organizationId: blogOrganizationIdSchema,
  }),
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, { blog: ["update"] });
    await assertPostInTenant(input.id, tenant);

    const db = getDrizzle();
    const now = new Date();
    const [existingLock] = await db
      .select()
      .from(blogPostLocks)
      .where(eq(blogPostLocks.postId, input.id))
      .limit(1);

    if (existingLock && existingLock.userId !== user.id && existingLock.expiresAt > now) {
      throw new ActionError({
        code: "CONFLICT",
        message: "Cet article est en cours d'édition par un autre utilisateur.",
      });
    }

    const expiresAt = new Date(Date.now() + BLOG_DEFAULTS.lockDurationMinutes * 60 * 1000);

    await db
      .insert(blogPostLocks)
      .values({
        postId: input.id,
        userId: user.id,
        sessionId: context.locals.session?.id ?? "unknown",
        expiresAt,
      })
      .onConflictDoUpdate({
        target: blogPostLocks.postId,
        set: { userId: user.id, sessionId: context.locals.session?.id ?? "unknown", expiresAt, lockedAt: new Date() },
      });

    return { success: true, expiresAt };
  },
});

export const unlockBlogPost = defineAction({
  input: z.object({
    id: z.uuid(),
    organizationId: blogOrganizationIdSchema,
  }),
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    await assertBlogPermission(context, tenant, { blog: ["update"] });
    await assertPostInTenant(input.id, tenant);

    const db = getDrizzle();
    await db.delete(blogPostLocks).where(eq(blogPostLocks.postId, input.id));
    invalidateBlogCache();
    return { success: true };
  },
});

export const listBlogPostRevisions = defineAction({
  input: z.object({
    postId: z.uuid(),
    organizationId: blogOrganizationIdSchema,
  }),
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    await assertBlogPermission(context, tenant, { blog: ["read"] });
    await assertPostInTenant(input.postId, tenant);

    const db = getDrizzle();
    return db
      .select()
      .from(blogPostRevisions)
      .where(eq(blogPostRevisions.postId, input.postId))
      .orderBy(desc(blogPostRevisions.createdAt))
      .limit(50);
  },
});
