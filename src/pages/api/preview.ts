import type { APIRoute } from "astro";
import { getPagePreview } from "@database/loaders/page.loader";

export const prerender = false;

/**
 * GET /api/preview?id={pageId}
 * Returns preview JSON for a CMS page (draft or published).
 * Requires admin authentication.
 */
export const GET: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user || user.role !== "admin") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const pageId = context.url.searchParams.get("id");
  if (!pageId) {
    return new Response(JSON.stringify({ error: "Missing id parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = await getPagePreview(pageId);
  if (!data) {
    return new Response(JSON.stringify({ error: "Page not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};
