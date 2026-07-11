import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// `astro:actions` is a virtual module resolved only by the Astro build pipeline.
// In tests we provide the minimal shim (defineAction passthrough + ActionError).
// This is NOT a data mock — the real database, resolvers, audit and cache run.
vi.mock('astro:actions', () => {
  class ActionError extends Error {
    code: string;
    constructor({ code, message }: { code: string; message: string }) {
      super(message);
      this.code = code;
    }
  }
  return { ActionError, defineAction: (def: any) => def };
});

import { getDrizzle } from '@database/drizzle';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { blogPosts, blogPostRevisions, blogReports, blogComments, blogPostReviews, blogPostTranslations, user } from '@database/schemas';
import { listBlogPostRevisions } from '@/actions/blog/post';
import { updateBlogReport, getBlogModerationQueue } from '@/actions/blog/moderation';
import { resolveBlogInternalLink } from '@/actions/blog/internal-link';
import { checkBlogPostLinks } from '@/actions/blog/check-links';
import type { Locale } from '@i18n/config';

// `defineAction` returns a typed callable; in tests we invoke `.handler` directly.
const listRevisions = (listBlogPostRevisions as any).handler as (i: any, c: any) => Promise<any>;
const updateReport = (updateBlogReport as any).handler as (i: any, c: any) => Promise<any>;
const getQueue = (getBlogModerationQueue as any).handler as (i: any, c: any) => Promise<any>;
const resolveLink = (resolveBlogInternalLink as any).handler as (i: any, c: any) => Promise<any>;
const checkLinks = (checkBlogPostLinks as any).handler as (i: any, c: any) => Promise<any>;

/**
 * Real integration tests against the seeded test database.
 * No DB mocking: the actions run against the actual Postgres instance,
 * exercising real queries, RBAC (admin bypass), audit and cache invalidation.
 * Only the ActionAPIContext is constructed locally (it is the caller, not data).
 */

function adminCtx(userId: string) {
  return {
    locals: { user: { id: userId, role: 'admin', email: 'admin@test.com', banned: false } },
    request: { headers: new Headers() },
    clientAddress: '127.0.0.1',
  } as any;
}

const db = getDrizzle();

describe('blog actions — integration (real DB)', () => {
  let globalPostId: string;
  let globalPostSlug: string;
  let realUserId: string;

  beforeAll(async () => {
    const [post] = await db
      .select({ id: blogPosts.id, slug: blogPostTranslations.slug })
      .from(blogPosts)
      .innerJoin(blogPostTranslations, eq(blogPostTranslations.postId, blogPosts.id))
      .where(and(isNull(blogPosts.organizationId), eq(blogPostTranslations.locale, 'fr')))
      .limit(1);
    if (!post) throw new Error('No global blog post seeded — run db:seed-blog-demo');
    globalPostId = post.id;
    globalPostSlug = post.slug;

    const [realUser] = await db.select({ id: user.id }).from(user).limit(1);
    if (!realUser) throw new Error('No user seeded — run db:seed');
    realUserId = realUser.id;
  });

  it('listBlogPostRevisions returns revisions for a seeded post', async () => {
    const revisions = await listRevisions(
      { postId: globalPostId, organizationId: null },
      adminCtx(realUserId),
    );
    expect(Array.isArray(revisions)).toBe(true);
    expect(revisions.length).toBeGreaterThan(0);
    // ordered by createdAt desc
    for (let i = 1; i < revisions.length; i++) {
      expect(new Date(revisions[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(revisions[i].createdAt).getTime(),
      );
    }
  });

  it('getBlogModerationQueue returns pending items', async () => {
    const queue = await getQueue(
      { organizationId: null, page: 1, limit: 20 },
      adminCtx(realUserId),
    );
    expect(queue).toHaveProperty('comments');
    expect(queue).toHaveProperty('reviews');
    expect(queue).toHaveProperty('reports');
    expect(Array.isArray(queue.comments)).toBe(true);
    expect(Array.isArray(queue.reviews)).toBe(true);
    expect(Array.isArray(queue.reports)).toBe(true);
  });

  it('updateBlogReport resolves a PENDING report and persists it', async () => {
    const [pending] = await db
      .select({ id: blogReports.id })
      .from(blogReports)
      .where(eq(blogReports.status, 'PENDING'))
      .limit(1);

    if (!pending) {
      // No pending report seeded in this environment — skip gracefully.
      console.warn('[test] no PENDING blog report seeded; skipping resolve assertion');
      return;
    }

    const res = await updateReport(
      { reportId: pending.id, status: 'RESOLVED', organizationId: null },
      adminCtx(realUserId),
    );
    expect(res.success).toBe(true);

    const [updated] = await db
      .select({ status: blogReports.status, resolvedBy: blogReports.resolvedBy })
      .from(blogReports)
      .where(eq(blogReports.id, pending.id))
      .limit(1);
    expect(updated.status).toBe('RESOLVED');
    expect(updated.resolvedBy).toBe(realUserId);
  });

  it('resolveBlogInternalLink resolves a real slug', async () => {
    const res = await resolveLink(
      { target: globalPostSlug, mode: 'resolve', locale: 'fr' as Locale, organizationId: null },
      adminCtx(realUserId),
    );
    expect(res.resolution.exists).toBe(true);
    expect(res.resolution.href).toContain('/fr/blog/');
  });

  it('resolveBlogInternalLink searches posts', async () => {
    const res = await resolveLink(
      { target: '', mode: 'search', query: 'Annecy', locale: 'fr' as Locale, organizationId: null },
      adminCtx(realUserId),
    );
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBeGreaterThan(0);
  });

  it('checkBlogPostLinks returns a structured report for a real post', async () => {
    const res = await checkLinks(
      { postId: globalPostId, locale: 'fr' as Locale, organizationId: null },
      adminCtx(realUserId),
    );
    expect(res).toHaveProperty('deadExplicit');
    expect(res).toHaveProperty('deadInline');
    expect(Array.isArray(res.deadExplicit)).toBe(true);
    expect(Array.isArray(res.deadInline)).toBe(true);
  });
});
