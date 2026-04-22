import type { APIRoute } from "astro";
import { sql } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { isValidLocale } from "@i18n/utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { DEFAULT_LOCALE } from "@i18n/config";

export const prerender = false;

/** Error codes returned as JSON — consumers map these to their own UI strings */
const ERROR_CODES = {
  QUERY_TOO_SHORT: "QUERY_TOO_SHORT",
  INVALID_LOCALE: "INVALID_LOCALE",
  RATE_LIMITED: "RATE_LIMITED",
} as const;

/** Map CMS locale to PostgreSQL text search configuration */
function getRegconfig(locale: string): string {
  switch (locale) {
    case "fr": return "french";
    case "en": return "english";
    case "es": return "spanish";
    default: return "simple";
  }
}

/**
 * Sanitise user input into a safe tsquery string.
 * Strips tsquery operators, prefix-matches on the last word for autocomplete.
 * Returns null if no valid tokens remain.
 */
function buildTsQuery(raw: string): string | null {
  const tokens = raw
    .split(/\s+/)
    .map((w) => w.replace(/[&|!():'\\<>]/g, "").trim())
    .filter((w) => w.length > 0);

  if (tokens.length === 0) return null;

  // Prefix-match the last word for autocomplete behaviour
  return tokens
    .map((w, i) => (i === tokens.length - 1 ? `${w}:*` : w))
    .join(" & ");
}

/**
 * GET /api/search?q=keyword&locale=fr&limit=20
 *
 * PostgreSQL full-text search across published CMS pages.
 * Uses tsvector/tsquery with GIN index, ts_rank for relevance, ts_headline for snippets.
 * Prefix matching on the last word enables autocomplete.
 */
export const GET: APIRoute = async ({ url, clientAddress }) => {
  const q = url.searchParams.get("q")?.trim();
  const locale = url.searchParams.get("locale") ?? DEFAULT_LOCALE;
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 100);

  if (!q || q.length < 2) {
    return new Response(
      JSON.stringify({ error: ERROR_CODES.QUERY_TOO_SHORT }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!isValidLocale(locale)) {
    return new Response(
      JSON.stringify({ error: ERROR_CODES.INVALID_LOCALE }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const rl = checkRateLimit(`search_${clientAddress}`, { window: 60, max: 60 });
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: ERROR_CODES.RATE_LIMITED }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  const tsQuery = buildTsQuery(q);
  if (!tsQuery) {
    return new Response(
      JSON.stringify({ error: ERROR_CODES.QUERY_TOO_SHORT }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const db = getDrizzle();
  const regconfig = getRegconfig(locale);

  const results = await db.execute<{
    id: string;
    slug: string;
    title: string;
    meta_description: string | null;
    published_at: Date | null;
    rank: number;
    headline: string;
  }>(sql`
    SELECT
      p.id,
      p.slug,
      p.title,
      p.meta_description,
      p.published_at,
      ts_rank(p.search_vector, to_tsquery(${sql.raw(`'${regconfig}'`)}, ${tsQuery})) AS rank,
      ts_headline(
        ${sql.raw(`'${regconfig}'`)},
        coalesce(p.meta_description, p.title),
        to_tsquery(${sql.raw(`'${regconfig}'`)}, ${tsQuery}),
        'MaxWords=30, MinWords=10, StartSel=<mark>, StopSel=</mark>'
      ) AS headline
    FROM pages p
    WHERE p.search_vector @@ to_tsquery(${sql.raw(`'${regconfig}'`)}, ${tsQuery})
      AND p.locale = ${locale}
      AND p.deleted_at IS NULL
      AND (p.is_published = true OR p.scheduled_at <= NOW())
    ORDER BY rank DESC
    LIMIT ${limit}
  `);

  return new Response(
    JSON.stringify({
      query: q,
      locale,
      count: results.length,
      results: results.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        excerpt: r.meta_description ?? null,
        highlight: r.headline,
        rank: r.rank,
        publishedAt: r.published_at,
        url: `/${locale}/${r.slug}`,
      })),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    },
  );
};
