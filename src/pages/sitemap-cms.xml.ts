import type { APIRoute } from "astro";
import { getPagesList } from "@database/loaders/page.loader";
import { LOCALES, type Locale } from "@i18n/config";
import { getCommonTranslations } from "@i18n/utils";

export const prerender = false;

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
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
