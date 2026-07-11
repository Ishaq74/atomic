import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { blogInternalLinkResolver } from "@/lib/blog/blog-internal-link";
import { registerInternalLinkResolver } from "@/lib/content/internal-link-resolver";

// Register the blog resolver into the shared content registry (idempotent).
registerInternalLinkResolver(blogInternalLinkResolver);

/**
 * Client-facing action used by the generic ContentEditor to resolve an internal
 * blog link (slug → URL + existence) and to search posts for the link picker.
 */
export const resolveBlogInternalLink = defineAction({
  input: z.object({
    target: z.string().trim().min(1),
    mode: z.enum(["resolve", "search"]).default("resolve"),
    query: z.string().trim().optional(),
    organizationId: z.string().trim().min(1).optional().nullable(),
    locale: z.string().trim().min(2).max(5),
  }),
  handler: async (input) => {
    const ctx = { locale: input.locale, organizationId: input.organizationId ?? null };
    if (input.mode === "search") {
      const results = await blogInternalLinkResolver.search(input.query ?? "", {
        ...ctx,
        limit: 10,
      });
      return { results };
    }
    const resolution = await blogInternalLinkResolver.resolve(input.target, ctx);
    return { resolution };
  },
});
