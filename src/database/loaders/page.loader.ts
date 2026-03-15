import { eq, and, asc } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { pages, pageSections } from "@database/schemas";

export interface PageWithSections {
  page: typeof pages.$inferSelect;
  sections: (typeof pageSections.$inferSelect)[];
}

/**
 * Load a published CMS page by locale and slug, including its visible sections.
 */
export async function getPage(
  locale: string,
  slug: string,
): Promise<PageWithSections | null> {
  const db = getDrizzle();

  const [page] = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.locale, locale),
        eq(pages.slug, slug),
        eq(pages.isPublished, true),
      ),
    )
    .limit(1);

  if (!page) return null;

  const sections = await db
    .select()
    .from(pageSections)
    .where(
      and(
        eq(pageSections.pageId, page.id),
        eq(pageSections.isVisible, true),
      ),
    )
    .orderBy(asc(pageSections.sortOrder));

  return { page, sections };
}

/**
 * List all published CMS pages for a locale (for sitemap, nav, etc.).
 */
export async function getPagesList(locale: string) {
  const db = getDrizzle();
  return db
    .select({
      id: pages.id,
      slug: pages.slug,
      title: pages.title,
      sortOrder: pages.sortOrder,
    })
    .from(pages)
    .where(
      and(eq(pages.locale, locale), eq(pages.isPublished, true)),
    )
    .orderBy(asc(pages.sortOrder));
}
