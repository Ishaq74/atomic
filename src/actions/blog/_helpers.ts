import { ActionError } from "astro:actions";
import type { ActionAPIContext } from "astro:actions";
import { z } from "astro/zod";
import { eq } from "drizzle-orm";
import { getDrizzle } from "@database/drizzle";
import { blogPosts, blogCategories, blogTags } from "@database/schemas";
import { logAuditEvent, extractIp, type AuditAction } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@database/cache";
import type { statement } from "@/lib/permissions";

type Statement = typeof statement;
type Permissions = { [K in keyof Statement]?: Statement[K][number][] };

export interface BlogTenantContext {
  organizationId: string | null;
  isOrgContext: boolean;
}

export const blogOrganizationIdSchema = z.string().trim().min(1).optional().nullable();

/**
 * Résout le tenant (organisation) à partir de l'input ou du contexte.
 * organizationId explicite = admin global ou org admin.
 * Si organizationId est absent/null, c'est le blog global.
 */
export function resolveBlogTenant(input: { organizationId?: string | null }): BlogTenantContext {
  return {
    organizationId: input.organizationId ?? null,
    isOrgContext: !!input.organizationId,
  };
}

/**
 * Vérifie que l'utilisateur est connecté et a les permissions requises.
 * Pour un contexte org, vérifie aussi qu'il est membre owner/admin de l'org
 * OU admin global.
 */
export async function assertBlogPermission(
  context: ActionAPIContext,
  tenant: BlogTenantContext,
  permissions: Permissions,
) {
  const user = context.locals.user;
  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "Vous devez être connecté pour effectuer cette action.",
    });
  }
  if (user.banned) {
    throw new ActionError({ code: "FORBIDDEN", message: "Compte suspendu." });
  }

  // Global admin bypass
  if (user.role === "admin") return user;

  // Org context: must be owner or admin of the org
  if (tenant.isOrgContext) {
    const { auth } = await import("@/lib/auth");
    const fullOrg = await auth.api.getFullOrganization({
      query: { organizationId: tenant.organizationId! },
      headers: context.request.headers,
    });

    if (!fullOrg) {
      throw new ActionError({ code: "NOT_FOUND", message: "Organisation introuvable." });
    }

    const member = (fullOrg.members ?? []).find(
      (m: { userId: string }) => m.userId === user.id,
    );

    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new ActionError({
        code: "FORBIDDEN",
        message: "Vous devez être propriétaire ou administrateur de cette organisation.",
      });
    }
  }

  // RBAC permission check
  const { auth } = await import("@/lib/auth");
  const result = await auth.api.userHasPermission({
    body: {
      userId: user.id,
      permissions: permissions as Record<string, string[]>,
    },
  });

  if (!result.success) {
    throw new ActionError({ code: "FORBIDDEN", message: "Permissions insuffisantes." });
  }

  return user;
}

/**
 * Vérifie qu'un post appartient bien au tenant demandé.
 */
export async function assertPostInTenant(postId: string, tenant: BlogTenantContext) {
  const db = getDrizzle();
  const [post] = await db
    .select({ id: blogPosts.id, organizationId: blogPosts.organizationId })
    .from(blogPosts)
    .where(eq(blogPosts.id, postId))
    .limit(1);

  if (!post) {
    throw new ActionError({ code: "NOT_FOUND", message: "Article introuvable." });
  }

  const postOrgId = post.organizationId ?? null;
  if (postOrgId !== tenant.organizationId) {
    throw new ActionError({ code: "FORBIDDEN", message: "Cet article n'appartient pas à ce tenant." });
  }

  return post;
}

export async function assertCategoryInTenant(categoryId: string, tenant: BlogTenantContext) {
  const db = getDrizzle();
  const [category] = await db
    .select({ id: blogCategories.id, organizationId: blogCategories.organizationId })
    .from(blogCategories)
    .where(eq(blogCategories.id, categoryId))
    .limit(1);

  if (!category) {
    throw new ActionError({ code: "NOT_FOUND", message: "Catégorie introuvable." });
  }

  const catOrgId = category.organizationId ?? null;
  if (catOrgId !== tenant.organizationId) {
    throw new ActionError({ code: "FORBIDDEN", message: "Cette catégorie n'appartient pas à ce tenant." });
  }

  return category;
}

export async function assertTagInTenant(tagId: string, tenant: BlogTenantContext) {
  const db = getDrizzle();
  const [tag] = await db
    .select({ id: blogTags.id, organizationId: blogTags.organizationId })
    .from(blogTags)
    .where(eq(blogTags.id, tagId))
    .limit(1);

  if (!tag) {
    throw new ActionError({ code: "NOT_FOUND", message: "Tag introuvable." });
  }

  const tagOrgId = tag.organizationId ?? null;
  if (tagOrgId !== tenant.organizationId) {
    throw new ActionError({ code: "FORBIDDEN", message: "Ce tag n'appartient pas à ce tenant." });
  }

  return tag;
}

export function blogRateLimit(
  _context: ActionAPIContext,
  userId: string,
  scope: string,
  opts = { window: 60, max: 30 },
) {
  const safeScope = scope.replace(/:/g, "_");
  const rl = checkRateLimit(`blog-${safeScope}:${userId}`, opts);
  if (!rl.allowed) {
    throw new ActionError({
      code: "TOO_MANY_REQUESTS",
      message: "Trop de requêtes. Veuillez réessayer dans quelques instants.",
    });
  }
}

/**
 * Rate-limit for public, unauthenticated-friendly blog endpoints (comments, reports).
 * Keys on IP address (like api/contact.ts) since a `userId` isn't always available
 * (guest comments) and isn't a reliable anti-abuse key anyway (trivial to bypass by
 * signing out). Falls back to a tighter shared global bucket when no IP can be
 * resolved (TRUST_PROXY not set), so the endpoint remains usable but still capped.
 */
export function blogPublicRateLimit(
  context: ActionAPIContext,
  scope: string,
  opts = { window: 300, max: 5 },
) {
  const safeScope = scope.replace(/:/g, "_");
  const ip = extractIp(context.request.headers, context.clientAddress);
  const key = ip ? `blog-${safeScope}:${ip}` : `blog-${safeScope}:__global__`;
  const rlOpts = ip ? opts : { window: opts.window, max: Math.max(1, Math.floor(opts.max / 3)) };
  const rl = checkRateLimit(key, rlOpts);
  if (!rl.allowed) {
    throw new ActionError({
      code: "TOO_MANY_REQUESTS",
      message: "Trop de requêtes. Veuillez réessayer dans quelques instants.",
    });
  }
}

export function auditBlog(
  context: ActionAPIContext,
  userId: string,
  action: AuditAction,
  opts?: {
    resource?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  void logAuditEvent({
    userId,
    action,
    resource: opts?.resource ?? null,
    resourceId: opts?.resourceId ?? null,
    metadata: opts?.metadata ?? null,
    ipAddress: extractIp(context.request.headers, context.clientAddress),
    userAgent: context.request.headers.get("user-agent"),
  }).catch(() => {});
}

/**
 * Invalide le cache blog de façon ciblée (sous-préfixes) plutôt que de vider
 * aveuglément tout le préfixe `blog:` (qui inclurait d'éventuels autres modules).
 * Les préfixes correspondent exactement aux clés générées par blog.loader.ts :
 *   blog:post:  blog:list:  blog:related:  blog:author:
 *   blog:categories:  blog:category:  blog:tags:  blog:tag:
 */
export function invalidateBlogCache() {
  for (const prefix of [
    "blog:post:",
    "blog:list:",
    "blog:related:",
    "blog:author:",
    "blog:categories:",
    "blog:category:",
    "blog:tags:",
    "blog:tag:",
  ]) {
    invalidateCache(prefix);
  }
}
