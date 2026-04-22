import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getPagesList } from "@database/loaders/page.loader";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@i18n/config";
import { getCommonTranslations } from "@i18n/utils";

export const prerender = false;

/**
 * GET /rss.xml
 * RSS feed of all published CMS pages across all locales.
 */
export const GET: APIRoute = async (context) => {
  const common = await getCommonTranslations(DEFAULT_LOCALE);

  const allItems: {
    title: string;
    link: string;
    pubDate?: Date;
  }[] = [];

  for (const locale of LOCALES) {
    let localePages: { id: string; slug: string; title: string; publishedAt: Date | null }[] = [];
    try {
      localePages = await getPagesList(locale as Locale);
    } catch (err) {
      console.error(`[rss] Failed to load pages for locale "${locale}":`, err);
      continue;
    }

    for (const page of localePages) {
      allItems.push({
        title: `[${locale.toUpperCase()}] ${page.title}`,
        link: `/${locale}/${page.slug}`,
        pubDate: page.publishedAt ?? undefined,
      });
    }
  }

  return rss({
    title: common.rss.title,
    description: common.rss.description,
    site: context.site!,
    items: allItems,
    customData: `<language>${DEFAULT_LOCALE}</language>`,
  });
};
