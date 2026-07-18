import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq, and, desc, isNull } from "drizzle-orm";
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
    // SECURITY/GOVERNANCE: `input.organizationId` is supplied by the client.
    // For a non-admin caller, assertBlogPermission already verified org
    // membership. For a global admin, the early-return in assertBlogPermission
    // allows targeting ANY organization (superuser privilege — see _helpers.ts).
    // This is intentional; document it explicitly so it is never "fixed" by
    // accident and so reviews can flag it as a deliberate platform-operator path.
    const user = await assertBlogPermission(context, tenant, {
      blog: tenant.isOrgContext ? ["create", "publish"] : ["create"],
    });
    blogRateLimit(context, user.id, "post-create");

    const db = getDrizzle();
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

    let post: typeof blogPosts.$inferSelect & { id: string };
    try {
      [post] = await db
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
    } catch (err) {
      // Unique index on (organization_id, slug) / (organization_id, locale, slug)
      // rejects a duplicate slug with a DB constraint violation — surface it as
      // a clean 4xx instead of a raw 500.
      if (err instanceof Error && /duplicate|unique/i.test(err.message)) {
        throw new ActionError({
          code: "CONFLICT",
          message: "Un article avec ce slug existe déjà pour ce tenant/locale.",
        });
      }
      throw err;
    }

    await db.insert(blogPostTranslations).values({
      postId: post.id,
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
      await db.insert(blogPostCategories).values(
        input.categoryIds.map((categoryId) => ({ postId: post.id, categoryId })),
      );
    }

    if (input.tagIds?.length) {
      await db.insert(blogPostTags).values(
        input.tagIds.map((tagId) => ({ postId: post.id, tagId })),
      );
    }

    if (input.seo) {
      await db.insert(blogPostSeo).values({
        postId: post.id,
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

    await db.insert(blogPostRevisions).values({
      postId: post.id,
      authorId: user.id,
      locale: input.locale,
      title: input.title,
      slug: input.slug,
      content,
      excerpt,
      status: toRevisionStatus(input.status),
      revisionNote: "Création initiale",
    });

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
    await assertPostInTenant(id, tenant);

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

    // Pre-check slug uniqueness before any write so a duplicate slug surfaces
    // as a clean 4xx instead of a raw 500 from the unique index.
    if (data.slug) {
      const orgCond = tenant.organizationId === null
        ? isNull(blogPosts.organizationId)
        : eq(blogPosts.organizationId, tenant.organizationId);
      const [dupPost] = await db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(and(eq(blogPosts.slug, data.slug), orgCond))
        .limit(1);
      if (dupPost && dupPost.id !== id) {
        throw new ActionError({
          code: "CONFLICT",
          message: "Un article avec ce slug existe déjà pour ce tenant.",
        });
      }
      if (locale) {
        const transOrgCond = tenant.organizationId === null
          ? isNull(blogPostTranslations.organizationId)
          : eq(blogPostTranslations.organizationId, tenant.organizationId);
        const [dupTrans] = await db
          .select({ id: blogPostTranslations.id })
          .from(blogPostTranslations)
          .where(and(eq(blogPostTranslations.slug, data.slug), eq(blogPostTranslations.locale, locale), transOrgCond))
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

    await db
      .update(blogPosts)
      .set({
        slug: data.slug,
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
        await db
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
        await db.insert(blogPostTranslations).values({
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
      await db.delete(blogPostCategories).where(eq(blogPostCategories.postId, id));
      if (categoryIds.length) {
        await db.insert(blogPostCategories).values(
          categoryIds.map((categoryId) => ({ postId: id, categoryId })),
        );
      }
    }

    if (tagIds !== undefined) {
      await db.delete(blogPostTags).where(eq(blogPostTags.postId, id));
      if (tagIds.length) {
        await db.insert(blogPostTags).values(tagIds.map((tagId) => ({ postId: id, tagId })));
      }
    }

    if (seo && locale) {
      const [existingSeo] = await db
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
        await db.update(blogPostSeo).set(seoValues).where(eq(blogPostSeo.id, existingSeo.id));
      } else {
        await db.insert(blogPostSeo).values({ postId: id, locale, ...seoValues });
      }
    }

    await db.insert(blogPostRevisions).values({
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
    await db
      .update(blogPosts)
      .set({ status: "PUBLISHED", publishedAt: new Date(), updatedBy: user.id })
      .where(eq(blogPosts.id, input.id));

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
