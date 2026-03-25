import type { APIRoute } from "astro";
import { getPagesList } from "@database/loaders/page.loader";
import { LOCALES, DEFAULT_LOCALE } from "@i18n/config";

export const prerender = false;

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = site?.origin ?? "http://localhost:4321";
  const urls: string[] = [];

  // Homepage per locale
  for (const locale of LOCALES) {
    const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
    urls.push(`  <url>\n    <loc>${escapeXml(baseUrl)}${prefix}/</loc>\n  </url>`);
  }

  // CMS pages per locale
  for (const locale of LOCALES) {
    let pages: { slug: string }[] = [];
    try {
      pages = await getPagesList(locale);
    } catch (err) {
      console.error(`[sitemap] Failed to load CMS pages for locale "${locale}":`, err);
    }
    const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
    for (const page of pages) {
      urls.push(
        `  <url>\n    <loc>${escapeXml(baseUrl)}${prefix}/${escapeXml(page.slug)}</loc>\n  </url>`,
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
