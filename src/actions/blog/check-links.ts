import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { eq, and } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { blogPosts, blogPostTranslations, blogPostLinks } from "@database/schemas";
import type { Locale } from "@i18n/config";
import { assertBlogPermission, resolveBlogTenant, blogRateLimit, auditBlog, blogOrganizationIdSchema } from "./_helpers";
import { detectDeadInternalLinks } from "@/lib/content/editor-helpers";
import { blogInternalLinkResolver } from "@/lib/blog/blog-internal-link";

/**
 * Admin action: scans a post for dead internal links.
 *  - explicit `blogPostLinks` whose target post no longer exists,
 *  - inline `<a data-internal-link="slug">` inside the post content whose slug
 *    is no longer published.
 * Returns a structured report the admin UI can render with warnings + removal.
 */
export const checkBlogPostLinks = defineAction({
  input: z.object({
    postId: z.string().uuid(),
    locale: z.string().min(2).max(5),
    organizationId: blogOrganizationIdSchema,
  }),
  handler: async (input, context) => {
    const tenant = resolveBlogTenant(input);
    const user = await assertBlogPermission(context, tenant, { blog: ["update"] });
    blogRateLimit(context, user.id, "link-check");

    const db = getDrizzle();
    const locale = input.locale as Locale;

    // 1. Explicit blogPostLinks whose target is gone.
    const explicitLinks = await db
      .select({
        id: blogPostLinks.id,
        linkType: blogPostLinks.linkType,
        targetPostId: blogPostLinks.targetPostId,
      })
      .from(blogPostLinks)
      .where(eq(blogPostLinks.sourcePostId, input.postId));

    const deadExplicit: { id: string; linkType: string; targetPostId: string }[] = [];
    for (const link of explicitLinks) {
      const [target] = await db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(and(eq(blogPosts.id, link.targetPostId), eq(blogPosts.status, "PUBLISHED")))
        .limit(1);
      if (!target) deadExplicit.push(link);
    }

    // 2. Inline links inside the content HTML.
    const [translation] = await db
      .select({ content: blogPostTranslations.content })
      .from(blogPostTranslations)
      .where(
        and(
          eq(blogPostTranslations.postId, input.postId),
          eq(blogPostTranslations.locale, locale),
        ),
      )
      .limit(1);

    const validTargets = await blogInternalLinkResolver.listValidTargets({
      locale,
      organizationId: tenant.organizationId,
    });

    const deadInline = translation ? detectDeadInternalLinks(translation.content, validTargets) : [];

    auditBlog(context, user.id, "BLOG_LINK_CHECK", {
      resource: "blog_posts",
      resourceId: input.postId,
      metadata: { deadExplicit: deadExplicit.length, deadInline: deadInline.length },
    });

    return {
      deadExplicit: deadExplicit.map((l) => ({ id: l.id, linkType: l.linkType, targetPostId: l.targetPostId })),
      deadInline: deadInline.map((d) => ({ href: d.href, text: d.text, target: d.target, reason: d.reason })),
    };
  },
});
