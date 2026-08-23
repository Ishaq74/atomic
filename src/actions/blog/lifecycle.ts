import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import {
  blogPosts,
  blogPostTranslations,
  blogPostCategories,
  blogPostTags,
  blogPostRevisions,
  blogPostSeo,
  blogPostGalleries,
  blogPostGalleryMedia,
} from "@database/schemas";
import { LOCALES } from "@i18n/config";
import type { BlogPostStatus } from "@/lib/blog/constants";
import {
  assertBlogPermission,
  assertPostInTenant,
  auditBlog,
  blogOrganizationIdSchema,
  invalidateBlogCache,
  resolveBlogTenant,
} from "./_helpers";

const lifecycleInput = z.object({
  id: z.uuid(),
  organizationId: blogOrganizationIdSchema,
});

const transitionMatrix: Record<BlogPostStatus, readonly BlogPostStatus[]> = {
  DRAFT: ["PUBLISHED", "ARCHIVED", "DELETED"],
  PUBLISHED: ["DRAFT", "ARCHIVED", "DELETED"],
  ARCHIVED: ["DRAFT", "DELETED"],
  DELETED: ["DRAFT"],
};

function assertTransition(from: BlogPostStatus, to: BlogPostStatus): void {
  if (!transitionMatrix[from].includes(to)) {
    throw new ActionError({
      code: "BAD_REQUEST",
      message: `Transition de statut invalide : ${from} → ${to}.`,
    });
  }
}

export const unpublishBlogPost = defineAction({
  input: lifecycleInput,
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, { blog: ["publish"] });
    const post = await assertPostInTenant(input.id, tenant);
    assertTransition(post.status as BlogPostStatus, "DRAFT");

    const db = getDrizzle();
    await db
      .update(blogPosts)
      .set({ status: "DRAFT", publishedAt: null, updatedBy: user.id })
      .where(eq(blogPosts.id, input.id));

    auditBlog(context, user.id, "BLOG_POST_UNPUBLISH", {
      resource: "blog_posts",
      resourceId: input.id,
      metadata: { organizationId: tenant.organizationId },
    });
    invalidateBlogCache();
    return { success: true };
  },
});

export const archiveBlogPost = defineAction({
  input: lifecycleInput,
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, { blog: ["update"] });
    const post = await assertPostInTenant(input.id, tenant);
    assertTransition(post.status as BlogPostStatus, "ARCHIVED");

    const db = getDrizzle();
    await db
      .update(blogPosts)
      .set({ status: "ARCHIVED", publishedAt: null, updatedBy: user.id })
      .where(eq(blogPosts.id, input.id));

    auditBlog(context, user.id, "BLOG_POST_ARCHIVE", {
      resource: "blog_posts",
      resourceId: input.id,
      metadata: { organizationId: tenant.organizationId },
    });
    invalidateBlogCache();
    return { success: true };
  },
});

export const restoreBlogPost = defineAction({
  input: lifecycleInput,
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, { blog: ["update"] });
    const post = await assertPostInTenant(input.id, tenant);
    assertTransition(post.status as BlogPostStatus, "DRAFT");

    const db = getDrizzle();
    await db
      .update(blogPosts)
      .set({ status: "DRAFT", publishedAt: null, updatedBy: user.id })
      .where(eq(blogPosts.id, input.id));

    auditBlog(context, user.id, "BLOG_POST_RESTORE", {
      resource: "blog_posts",
      resourceId: input.id,
      metadata: { organizationId: tenant.organizationId },
    });
    invalidateBlogCache();
    return { success: true };
  },
});

export const duplicateBlogPost = defineAction({
  input: lifecycleInput,
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, { blog: ["create"] });
    const source = await assertPostInTenant(input.id, tenant);
    const db = getDrizzle();

    const translations = await db
      .select()
      .from(blogPostTranslations)
      .where(eq(blogPostTranslations.postId, input.id))
      .orderBy(blogPostTranslations.locale);
    if (translations.length === 0) {
      throw new ActionError({ code: "BAD_REQUEST", message: "Impossible de dupliquer un article sans traduction." });
    }

    const categories = await db
      .select({ categoryId: blogPostCategories.categoryId })
      .from(blogPostCategories)
      .where(eq(blogPostCategories.postId, input.id));
    const tags = await db
      .select({ tagId: blogPostTags.tagId })
      .from(blogPostTags)
      .where(eq(blogPostTags.postId, input.id));
    const seo = await db
      .select()
      .from(blogPostSeo)
      .where(eq(blogPostSeo.postId, input.id));
    const galleries = await db
      .select()
      .from(blogPostGalleries)
      .where(eq(blogPostGalleries.postId, input.id));

    const suffix = "-copy";
    const canonicalBase = `${source.slug}${suffix}`;
    let canonicalSlug = canonicalBase;
    for (let i = 2; ; i += 1) {
      const orgCondition = tenant.organizationId === null
        ? isNull(blogPosts.organizationId)
        : eq(blogPosts.organizationId, tenant.organizationId);
      const [collision] = await db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(and(eq(blogPosts.slug, canonicalSlug), orgCondition))
        .limit(1);
      if (!collision) break;
      canonicalSlug = `${canonicalBase}-${i}`;
    }

    const duplicated = await db.transaction(async (tx) => {
      const [post] = await tx
        .insert(blogPosts)
        .values({
          organizationId: tenant.organizationId,
          authorId: source.authorId,
          slug: canonicalSlug,
          status: "DRAFT",
          featuredImageId: source.featuredImageId,
          isFeatured: source.isFeatured,
          isSticky: false,
          commentStatus: source.commentStatus,
          allowReviews: source.allowReviews,
          seoScore: source.seoScore,
          publishedAt: null,
          updatedBy: user.id,
        })
        .returning();

      for (const translation of translations) {
        const translationSlug = translation.locale === LOCALES[0]
          ? canonicalSlug
          : `${translation.slug}${suffix}`;
        await tx.insert(blogPostTranslations).values({
          postId: post.id,
          organizationId: tenant.organizationId,
          locale: translation.locale,
          title: translation.title,
          slug: translationSlug,
          content: translation.content,
          excerpt: translation.excerpt,
          metaTitle: translation.metaTitle,
          metaDescription: translation.metaDescription,
          metaKeywords: translation.metaKeywords,
          canonicalUrl: null,
          ogTitle: translation.ogTitle,
          ogDescription: translation.ogDescription,
          ogImageId: translation.ogImageId,
        });
      }

      if (categories.length) {
        await tx.insert(blogPostCategories).values(
          categories.map(({ categoryId }) => ({ postId: post.id, categoryId })),
        );
      }
      if (tags.length) {
        await tx.insert(blogPostTags).values(
          tags.map(({ tagId }) => ({ postId: post.id, tagId })),
        );
      }
      if (seo.length) {
        await tx.insert(blogPostSeo).values(
          seo.map(({ id: _id, postId: _postId, ...values }) => ({ postId: post.id, ...values })),
        );
      }

      for (const gallery of galleries) {
        const [newGallery] = await tx
          .insert(blogPostGalleries)
          .values({
            postId: post.id,
            title: gallery.title,
            description: gallery.description,
            sortOrder: gallery.sortOrder,
          })
          .returning();
        const media = await db
          .select()
          .from(blogPostGalleryMedia)
          .where(eq(blogPostGalleryMedia.galleryId, gallery.id));
        if (media.length) {
          await tx.insert(blogPostGalleryMedia).values(
            media.map(({ galleryId: _galleryId, ...item }) => ({ galleryId: newGallery.id, ...item })),
          );
        }
      }

      await tx.insert(blogPostRevisions).values({
        postId: post.id,
        authorId: user.id,
        locale: translations[0].locale,
        title: translations[0].title,
        slug: canonicalSlug,
        content: translations[0].content,
        excerpt: translations[0].excerpt,
        status: "DRAFT",
        revisionNote: "Duplication de l'article",
      });

      return post;
    });

    auditBlog(context, user.id, "BLOG_POST_CREATE", {
      resource: "blog_posts",
      resourceId: duplicated.id,
      metadata: { organizationId: tenant.organizationId, duplicatedFrom: input.id },
    });
    invalidateBlogCache();
    return { id: duplicated.id, slug: duplicated.slug };
  },
});

export const restoreBlogPostRevision = defineAction({
  input: z.object({
    postId: z.uuid(),
    revisionId: z.uuid(),
    organizationId: blogOrganizationIdSchema,
  }),
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, { blog: ["update"] });
    await assertPostInTenant(input.postId, tenant);
    const db = getDrizzle();

    const [revision] = await db
      .select()
      .from(blogPostRevisions)
      .where(and(eq(blogPostRevisions.id, input.revisionId), eq(blogPostRevisions.postId, input.postId)))
      .limit(1);
    if (!revision) {
      throw new ActionError({ code: "NOT_FOUND", message: "Révision introuvable." });
    }

    await db.transaction(async (tx) => {
      const [translation] = await tx
        .select()
        .from(blogPostTranslations)
        .where(and(eq(blogPostTranslations.postId, input.postId), eq(blogPostTranslations.locale, revision.locale)))
        .limit(1);

      if (translation) {
        await tx
          .update(blogPostTranslations)
          .set({
            title: revision.title,
            slug: revision.slug,
            content: revision.content,
            excerpt: revision.excerpt,
          })
          .where(eq(blogPostTranslations.id, translation.id));
      } else {
        await tx.insert(blogPostTranslations).values({
          postId: input.postId,
          organizationId: tenant.organizationId,
          locale: revision.locale,
          title: revision.title,
          slug: revision.slug,
          content: revision.content,
          excerpt: revision.excerpt,
        });
      }

      await tx
        .update(blogPosts)
        .set({
          slug: revision.slug,
          status: revision.status,
          publishedAt: revision.status === "PUBLISHED" ? new Date() : null,
          updatedBy: user.id,
        })
        .where(eq(blogPosts.id, input.postId));

      await tx.insert(blogPostRevisions).values({
        postId: input.postId,
        authorId: user.id,
        locale: revision.locale,
        title: revision.title,
        slug: revision.slug,
        content: revision.content,
        excerpt: revision.excerpt,
        status: revision.status,
        revisionNote: `Restauration de la révision ${revision.id}`,
      });
    });

    auditBlog(context, user.id, "BLOG_POST_UPDATE", {
      resource: "blog_posts",
      resourceId: input.postId,
      metadata: { organizationId: tenant.organizationId, restoredRevisionId: input.revisionId },
    });
    invalidateBlogCache();
    return { success: true };
  },
});
