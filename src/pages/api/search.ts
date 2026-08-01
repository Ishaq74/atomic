import type { APIRoute } from "astro";
import { sql, eq } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { organization } from "@database/schemas";
import { isValidLocale } from "@i18n/utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { DEFAULT_LOCALE } from "@i18n/config";
import { buildBlogPostUrl } from "@/lib/blog/utils";
import { publicBlogPostColumnsScope } from "@/lib/blog/public-visibility";

export const prerender = false;

/** Error codes returned as JSON — consumers map these to their own UI strings */
const ERROR_CODES = {
  QUERY_TOO_SHORT: "QUERY_TOO_SHORT",
  INVALID_LOCALE: "INVALID_LOCALE",
  RATE_LIMITED: "RATE_LIMITED",
} as const;

/** Map CMS locale to PostgreSQL text search configuration */
export function getRegconfig(locale: string): string {
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
export function buildTsQuery(raw: string): string | null {
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
 * PostgreSQL full-text search across published CMS pages AND published global
 * blog posts (org-scoped blogs are out of scope for this sitewide endpoint).
 * Uses tsvector/tsquery with GIN indexes, ts_rank for relevance, ts_headline for
 * snippets. Prefix matching on the last word enables autocomplete. Results from
 * both sources are merged and re-ranked together.
 */
export const GET: APIRoute = async ({ url, clientAddress }) => {
  const q = url.searchParams.get("q")?.trim();
  const locale = url.searchParams.get("locale") ?? DEFAULT_LOCALE;
  const orgSlug = url.searchParams.get("org")?.trim() || null;
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

  // Resolve an optional organization scope. When `org` is provided, the blog
  // search is restricted to that organization's posts; otherwise only the
  // global (non-org) blog is searched.
  let orgId: string | null = null;
  if (orgSlug) {
    const [orgRow] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, orgSlug))
      .limit(1);
    orgId = orgRow?.id ?? null;
    if (!orgId) {
      return new Response(
        JSON.stringify({ query: q, locale, count: 0, results: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const blogOrganizationPredicate = orgId
    ? sql`bp.organization_id = ${orgId}`
    : sql`bp.organization_id IS NULL`;
  const blogPublicationPredicate = publicBlogPostColumnsScope(
    sql.raw("bp.status"),
    sql.raw("bp.published_at"),
  );

  const raw = await db.execute<{
    type: "page" | "blog_post";
    id: string;
    slug: string;
    category_slug: string | null;
    title: string;
    excerpt: string | null;
    published_at: Date | null;
    rank: number;
    headline: string;
  }>(sql`
    SELECT * FROM (
      SELECT
        'page' AS type,
        p.id,
        p.slug,
        NULL::text AS category_slug,
        p.title,
        p.meta_description AS excerpt,
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

      UNION ALL

      SELECT
        'blog_post' AS type,
        bp.id,
        bpt.slug,
        (
          SELECT coalesce(bct.slug, bc.slug)
          FROM blog_post_categories bpc
          JOIN blog_categories bc ON bc.id = bpc.category_id
          LEFT JOIN blog_category_translations bct
            ON bct.category_id = bc.id AND bct.locale = ${locale}
          WHERE bpc.post_id = bp.id
          ORDER BY bc.sort_order ASC
          LIMIT 1
        ) AS category_slug,
        bpt.title,
        bpt.excerpt,
        bp.published_at,
        ts_rank(bpt.search_vector, to_tsquery(${sql.raw(`'${regconfig}'`)}, ${tsQuery})) AS rank,
        ts_headline(
          ${sql.raw(`'${regconfig}'`)},
          coalesce(bpt.excerpt, bpt.title),
          to_tsquery(${sql.raw(`'${regconfig}'`)}, ${tsQuery}),
          'MaxWords=30, MinWords=10, StartSel=<mark>, StopSel=</mark>'
        ) AS headline
      FROM blog_posts bp
      JOIN blog_post_translations bpt ON bpt.post_id = bp.id AND bpt.locale = ${locale}
      WHERE bpt.search_vector @@ to_tsquery(${sql.raw(`'${regconfig}'`)}, ${tsQuery})
        AND ${blogOrganizationPredicate}
        AND ${blogPublicationPredicate}
    ) combined
    ORDER BY rank DESC
    LIMIT ${limit}
  `);

  // drizzle's `execute` returns a driver result object; normalize to rows.
  const results = Array.isArray(raw) ? raw : ((raw as any)?.rows ?? []);

  return new Response(
    JSON.stringify({
      query: q,
      locale,
      count: results.length,
      results: results.map((r: any) => ({
        id: r.id,
        type: r.type,
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt ?? null,
        highlight: r.headline,
        rank: r.rank,
        publishedAt: r.published_at,
        url:
          r.type === "blog_post"
            ? buildBlogPostUrl(locale, orgSlug, r.slug, r.category_slug)
            : `/${locale}/${r.slug}`,
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
