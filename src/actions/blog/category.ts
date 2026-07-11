import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { eq, and, isNull, or } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { blogCategories, blogCategoryTranslations, blogPostCategories } from "@database/schemas";
import { invalidateCache } from "@database/cache";
import { DEFAULT_LOCALE, type Locale } from "@i18n/config";
import { blogCategoryFormSchema, blogCategoryUpdateSchema } from "@/lib/blog/validation";
import {
  assertBlogPermission,
  resolveBlogTenant,
  assertCategoryInTenant,
  blogRateLimit,
  auditBlog,
  blogOrganizationIdSchema,
} from "./_helpers";

function categoryTenantScope(organizationId: string | null) {
  return organizationId === null
    ? isNull(blogCategories.organizationId)
    : eq(blogCategories.organizationId, organizationId);
}

async function assertBaseCategorySlugAvailable(
  organizationId: string | null,
  slug: string,
  currentCategoryId?: string,
) {
  const db = getDrizzle();
  const [existing] = await db
    .select({ id: blogCategories.id })
    .from(blogCategories)
    .where(and(categoryTenantScope(organizationId), eq(blogCategories.slug, slug)))
    .limit(1);

  if (existing && existing.id !== currentCategoryId) {
    throw new ActionError({
      code: "CONFLICT",
      message: `Une autre catégorie utilise déjà le slug « ${slug} » comme slug canonique.`,
    });
  }
}

async function assertLocalizedCategorySlugAvailable(
  organizationId: string | null,
  locale: Locale,
  slug: string,
  currentCategoryId?: string,
) {
  const db = getDrizzle();
  const [existing] = await db
    .select({ id: blogCategories.id })
    .from(blogCategories)
    .leftJoin(
      blogCategoryTranslations,
      and(
        eq(blogCategoryTranslations.categoryId, blogCategories.id),
        eq(blogCategoryTranslations.locale, locale),
      ),
    )
    .where(
      and(
        categoryTenantScope(organizationId),
        or(
          eq(blogCategoryTranslations.slug, slug),
          and(isNull(blogCategoryTranslations.id), eq(blogCategories.slug, slug)),
        ),
      ),
    )
    .limit(1);

  if (existing && existing.id !== currentCategoryId) {
    throw new ActionError({
      code: "CONFLICT",
      message: `Une autre catégorie utilise déjà le slug « ${slug} » pour la locale « ${locale} ».`,
    });
  }
}

export const createBlogCategory = defineAction({
  input: blogCategoryFormSchema.extend({
    organizationId: blogOrganizationIdSchema,
  }),
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, { blogCategory: ["create"] });
    blogRateLimit(context, user.id, "category-create");

    const db = getDrizzle();

    await assertBaseCategorySlugAvailable(tenant.organizationId, input.slug);
    await assertLocalizedCategorySlugAvailable(tenant.organizationId, input.locale, input.slug);

    const [category] = await db
      .insert(blogCategories)
      .values({
        organizationId: tenant.organizationId,
        parentId: input.parentId,
        slug: input.slug,
        icon: input.icon,
        color: input.color,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();

    await db.insert(blogCategoryTranslations).values({
      categoryId: category.id,
      locale: input.locale,
      name: input.name,
      slug: input.slug,
      description: input.description,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
    });

    auditBlog(context, user.id, "BLOG_CATEGORY_CREATE", {
      resource: "blog_categories",
      resourceId: category.id,
      metadata: { organizationId: tenant.organizationId, locale: input.locale, slug: input.slug },
    });

    invalidateCache("blog:categories");
    return { id: category.id, slug: input.slug };
  },
});

export const updateBlogCategory = defineAction({
  input: blogCategoryUpdateSchema.extend({
    organizationId: blogOrganizationIdSchema,
  }),
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, { blogCategory: ["update"] });
    blogRateLimit(context, user.id, "category-update");

    const { id, organizationId: _, ...data } = input;
    await assertCategoryInTenant(id, tenant);

    const db = getDrizzle();

    if (data.slug) {
      if (!data.locale || data.locale === DEFAULT_LOCALE) {
        await assertBaseCategorySlugAvailable(tenant.organizationId, data.slug, id);
      }

      if (data.locale) {
        await assertLocalizedCategorySlugAvailable(tenant.organizationId, data.locale, data.slug, id);
      }
    }

    await db
      .update(blogCategories)
      .set({
        parentId: data.parentId,
        ...((data.slug !== undefined && (!data.locale || data.locale === DEFAULT_LOCALE))
          ? { slug: data.slug }
          : {}),
        icon: data.icon,
        color: data.color,
        sortOrder: data.sortOrder,
      })
      .where(eq(blogCategories.id, id));

    if (data.locale) {
      const [translation] = await db
        .select()
        .from(blogCategoryTranslations)
        .where(and(eq(blogCategoryTranslations.categoryId, id), eq(blogCategoryTranslations.locale, data.locale)))
        .limit(1);

      if (translation) {
        await db
          .update(blogCategoryTranslations)
          .set({
            name: data.name,
            slug: data.slug,
            description: data.description,
            metaTitle: data.metaTitle,
            metaDescription: data.metaDescription,
          })
          .where(eq(blogCategoryTranslations.id, translation.id));
      } else {
        await db.insert(blogCategoryTranslations).values({
          categoryId: id,
          locale: data.locale,
          name: data.name!,
          slug: data.slug!,
          description: data.description,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
        });
      }
    }

    auditBlog(context, user.id, "BLOG_CATEGORY_UPDATE", {
      resource: "blog_categories",
      resourceId: id,
      metadata: { organizationId: tenant.organizationId, locale: data.locale, slug: data.slug },
    });

    invalidateCache("blog:categories");
    return { id };
  },
});

export const deleteBlogCategory = defineAction({
  input: z.object({
    id: z.string().uuid(),
    organizationId: blogOrganizationIdSchema,
    reassignToId: z.string().uuid().optional(),
  }),
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, { blogCategory: ["delete"] });
    blogRateLimit(context, user.id, "category-delete");

    await assertCategoryInTenant(input.id, tenant);
    const db = getDrizzle();

    if (input.reassignToId) {
      await assertCategoryInTenant(input.reassignToId, tenant);
      await db
        .update(blogPostCategories)
        .set({ categoryId: input.reassignToId })
        .where(eq(blogPostCategories.categoryId, input.id));
    }

    await db.delete(blogCategories).where(eq(blogCategories.id, input.id));

    auditBlog(context, user.id, "BLOG_CATEGORY_DELETE", {
      resource: "blog_categories",
      resourceId: input.id,
      metadata: { organizationId: tenant.organizationId, reassignToId: input.reassignToId },
    });

    invalidateCache("blog:categories");
    return { success: true };
  },
});
