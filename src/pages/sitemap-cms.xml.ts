import type { APIRoute } from "astro";
import { getPagesList } from "@database/loaders/page.loader";
import { getBlogCategories, getBlogTags, getBlogPosts } from "@database/loaders/blog.loader";
import { LOCALES, type Locale } from "@i18n/config";
import { getCommonTranslations, getBlogTranslations } from "@i18n/utils";
import { buildBlogCategoryUrl, buildBlogPostUrl, buildBlogTagUrl } from "@/lib/blog/utils";

export const prerender = false;

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function urlEntry(baseUrl: string, path: string, lastmod?: Date | null): string {
  const loc = `    <loc>${escapeXml(baseUrl)}${escapeXml(path)}</loc>`;
  const mod = lastmod ? `\n    <lastmod>${lastmod.toISOString()}</lastmod>` : "";
  return `  <url>\n${loc}${mod}\n  </url>`;
}

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = site?.origin ?? "http://localhost:4321";
  const urls: string[] = [];

  // Homepage per locale (prefixDefaultLocale is true — all locales get /{locale}/ prefix)
  for (const locale of LOCALES) {
    urls.push(`  <url>\n    <loc>${escapeXml(baseUrl)}/${locale}/</loc>\n  </url>`);
  }

  // Static content pages per locale (about, contact, legal — with localized slugs)
  for (const locale of LOCALES) {
    const commonT = await getCommonTranslations(locale as Locale);
    for (const slug of Object.values(commonT.pageRoutes)) {
      urls.push(
        `  <url>\n    <loc>${escapeXml(baseUrl)}/${locale}/${escapeXml(slug)}</loc>\n  </url>`,
      );
    }
  }

  // CMS pages per locale (dynamic content from database)
  for (const locale of LOCALES) {
    let pages: { slug: string }[] = [];
    try {
      pages = await getPagesList(locale as Locale);
    } catch (err) {
      console.error(`[sitemap] Failed to load CMS pages for locale "${locale}":`, err);
    }
    for (const page of pages) {
      urls.push(
        `  <url>\n    <loc>${escapeXml(baseUrl)}/${locale}/${escapeXml(page.slug)}</loc>\n  </url>`,
      );
    }
  }

  // Global blog (org-scoped blogs are excluded — no per-org discovery mechanism here)
  for (const locale of LOCALES) {
    try {
      const blogT = await getBlogTranslations(locale as Locale);
      urls.push(urlEntry(baseUrl, `/${locale}/${blogT.routes.blog}`));

      const categories = await getBlogCategories(null, locale as Locale);
      for (const category of categories) {
        urls.push(urlEntry(baseUrl, buildBlogCategoryUrl(locale as Locale, null, category.slug)));
      }

      const tags = await getBlogTags(null, locale as Locale);
      for (const tag of tags) {
        urls.push(urlEntry(baseUrl, buildBlogTagUrl(locale as Locale, null, blogT.routes.tags, tag.slug)));
      }

      // Page through every published post (loader caps at 100/page).
      let page = 1;
      for (;;) {
        const { items, meta } = await getBlogPosts(null, locale as Locale, { page, limit: 100 });
        for (const item of items) {
          if (!item.translation) continue;
          const categorySlug = item.categories[0]?.slug ?? null;
          urls.push(
            urlEntry(
              baseUrl,
              buildBlogPostUrl(locale as Locale, null, item.translation.slug, categorySlug),
              item.post.updatedAt ?? item.post.publishedAt ?? null,
            ),
          );
        }
        if (!meta.hasNextPage) break;
        page += 1;
      }
    } catch (err) {
      console.error(`[sitemap] Failed to load blog content for locale "${locale}":`, err);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
