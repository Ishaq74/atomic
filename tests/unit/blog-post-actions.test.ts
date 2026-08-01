import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────
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

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockTransaction = vi.fn();
const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  transaction: mockTransaction,
};

vi.mock('@database/drizzle', () => ({
  getDrizzle: vi.fn(() => mockDb),
}));

vi.mock('@database/schemas', () => ({
  blogPosts: { id: 'id', organizationId: 'organizationId', status: 'status', authorId: 'authorId', slug: 'slug', publishedAt: 'publishedAt', isFeatured: 'isFeatured', isSticky: 'isSticky' },
  blogPostTranslations: { id: 'id', postId: 'postId', locale: 'locale', slug: 'slug' },
  blogPostCategories: { postId: 'postId', categoryId: 'categoryId' },
  blogPostTags: { postId: 'postId', tagId: 'tagId' },
  blogPostRevisions: { id: 'id', postId: 'postId', createdAt: 'createdAt' },
  blogPostSeo: { id: 'id', postId: 'postId', locale: 'locale' },
  blogPostLocks: { id: 'id', postId: 'postId', userId: 'userId', expiresAt: 'expiresAt' },
  blogCategories: { id: 'id', organizationId: 'organizationId' },
  blogTags: { id: 'id', organizationId: 'organizationId' },
  mediaFiles: { id: 'id', organizationId: 'organizationId' },
}));

vi.mock('@database/cache', () => ({ invalidateCache: vi.fn() }));
vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
  extractIp: vi.fn(() => '127.0.0.1'),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 10 })),
}));
vi.mock('@i18n/config', () => ({ LOCALES: ['fr', 'en', 'es', 'ar'] as const }));
const mockGetFullOrganization = vi.fn();
const mockUserHasPermission = vi.fn(() => Promise.resolve({ success: true }));
const mockHasPermission = vi.fn(() => Promise.resolve({ success: true }));
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getFullOrganization: mockGetFullOrganization,
      userHasPermission: mockUserHasPermission,
      hasPermission: mockHasPermission,
    },
  },
}));

// ── Imports ─────────────────────────────────────────────────────────
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  publishBlogPost,
  lockBlogPost,
  unlockBlogPost,
} from '@/actions/blog/post';
import { checkRateLimit } from '@/lib/rate-limit';

const createPost = createBlogPost as unknown as { handler: (...a: any[]) => Promise<any> };
const updatePost = updateBlogPost as unknown as { handler: (...a: any[]) => Promise<any> };
const deletePost = deleteBlogPost as unknown as { handler: (...a: any[]) => Promise<any> };
const publishPost = publishBlogPost as unknown as { handler: (...a: any[]) => Promise<any> };
const lockPost = lockBlogPost as unknown as { handler: (...a: any[]) => Promise<any> };
const unlockPost = unlockBlogPost as unknown as { handler: (...a: any[]) => Promise<any> };

function adminCtx(overrides: Partial<{ id: string; role: string; banned: boolean }> = {}) {
  return {
    locals: {
      user: { id: 'admin-1', role: 'admin', banned: false, ...overrides },
      session: { id: 'sess-1' },
    },
    request: { headers: new Headers() },
    clientAddress: '127.0.0.1',
  } as any;
}

/** Generic chainable thenable mimicking drizzle's fluent query builder. */
function makeChain(rows: any[]) {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve(rows)),
    then: (resolve: any) => resolve(rows),
  };
  return chain;
}

function makeMutationChain(returningRows: any[] = []) {
  const chain: any = {
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
    where: vi.fn(() => chain),
    onConflictDoUpdate: vi.fn(() => Promise.resolve(undefined)),
    returning: vi.fn(() => Promise.resolve(returningRows)),
    then: (resolve: any) => resolve(undefined),
  };
  return chain;
}

beforeEach(() => {
  mockSelect.mockReset();
  mockInsert.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
  mockTransaction.mockReset().mockImplementation(async (callback: (tx: typeof mockDb) => Promise<unknown>) => callback(mockDb));
  mockGetFullOrganization.mockReset();
  mockUserHasPermission.mockReset().mockResolvedValue({ success: true });
  mockHasPermission.mockReset().mockResolvedValue({ success: true });
  vi.mocked(checkRateLimit).mockReset().mockReturnValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60_000 });
});

const validPostInput = {
  locale: 'fr' as const,
  title: 'Un titre de test suffisamment long',
  slug: 'un-titre-de-test',
  content: '<p>'.padEnd(320, 'x') + '</p>',
  status: 'DRAFT' as const,
};

describe('createBlogPost', () => {
  it('rejects anonymous users', async () => {
    await expect(
      createPost.handler({ ...validPostInput, organizationId: null }, { ...adminCtx(), locals: { user: null } }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('rejects banned users', async () => {
    await expect(
      createPost.handler({ ...validPostInput, organizationId: null }, adminCtx({ banned: true })),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('creates a global post as admin and returns id + slug', async () => {
    mockInsert.mockReturnValue(makeMutationChain([{ id: 'post-1' }]));

    const result = await createPost.handler({ ...validPostInput, organizationId: null }, adminCtx());

    expect(result).toEqual({ id: 'post-1', slug: validPostInput.slug });
    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(mockGetFullOrganization).not.toHaveBeenCalled();
  });

  it('requires create and publish permissions when creating published content', async () => {
    mockInsert.mockReturnValue(makeMutationChain([{ id: 'post-1' }]));

    await createPost.handler(
      { ...validPostInput, status: 'PUBLISHED', organizationId: null },
      adminCtx(),
    );

    expect(mockUserHasPermission).toHaveBeenCalledWith({
      body: {
        userId: 'admin-1',
        permissions: { blog: ['create', 'publish'] },
      },
    });
  });

  it('enforces rate limiting on post creation', async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });

    await expect(
      createPost.handler({ ...validPostInput, organizationId: null }, adminCtx()),
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('sanitizes HTML content before persisting', async () => {
    const chain = makeMutationChain([{ id: 'post-2' }]);
    mockInsert.mockReturnValue(chain);

    await createPost.handler(
      { ...validPostInput, content: `${validPostInput.content}<script>alert(1)</script>`, organizationId: null },
      adminCtx(),
    );

    // insert() is called for: blogPosts, blogPostTranslations, blogPostRevisions (in that order)
    const translationValuesCall = chain.values.mock.calls[1][0];
    expect(translationValuesCall.content).not.toContain('<script>');
  });

  it('rejects a non-admin org member without RBAC permission', async () => {
    mockHasPermission.mockResolvedValueOnce({ success: false });

    await expect(
      createPost.handler(
        { ...validPostInput, organizationId: 'org-1' },
        adminCtx({ id: 'user-1', role: 'user' }),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockHasPermission).toHaveBeenCalled();
  });
});

describe('updateBlogPost', () => {
  it('rejects updating a post belonging to a different tenant', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'post-1', organizationId: 'org-9' }]));

    await expect(
      updatePost.handler({ id: 'post-1', organizationId: null }, adminCtx()),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejects when the post is locked by another user', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ id: 'post-1', organizationId: null }])) // assertPostInTenant
      .mockReturnValueOnce(makeChain([{ postId: 'post-1', userId: 'other-user', expiresAt: new Date(Date.now() + 60_000) }])); // lock check

    await expect(
      updatePost.handler({ id: 'post-1', organizationId: null, title: 'New title' }, adminCtx()),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('allows update when the lock belongs to the requesting user', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ id: 'post-1', organizationId: null }])) // assertPostInTenant
      .mockReturnValueOnce(makeChain([{ postId: 'post-1', userId: 'admin-1', expiresAt: new Date(Date.now() + 60_000) }])) // lock check (own lock)
      .mockReturnValueOnce(makeChain([])) // slug pre-check on blogPosts (no duplicate)
      .mockReturnValueOnce(makeChain([])) // slug pre-check on blogPostTranslations (no duplicate)
      .mockReturnValueOnce(makeChain([])); // existing translation lookup (none)
    mockUpdate.mockReturnValue(makeMutationChain());
    mockInsert.mockReturnValue(makeMutationChain());

    const result = await updatePost.handler(
      {
        id: 'post-1',
        organizationId: null,
        locale: 'fr',
        title: 'New title',
        slug: 'new-title',
        content: validPostInput.content,
        status: 'DRAFT',
      },
      adminCtx(),
    );

    expect(result).toEqual({ id: 'post-1' });
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it('requires update and publish permissions for a published update', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ id: 'post-1', organizationId: null }]))
      .mockReturnValueOnce(makeChain([]));
    mockUpdate.mockReturnValue(makeMutationChain());
    mockInsert.mockReturnValue(makeMutationChain());

    await updatePost.handler(
      { id: 'post-1', organizationId: null, status: 'PUBLISHED' },
      adminCtx(),
    );

    expect(mockUserHasPermission).toHaveBeenCalledWith({
      body: {
        userId: 'admin-1',
        permissions: { blog: ['update', 'publish'] },
      },
    });
  });
});

describe('deleteBlogPost', () => {
  it('soft-deletes by default (status = DELETED)', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'post-1', organizationId: null }]));
    const updateChain = makeMutationChain();
    mockUpdate.mockReturnValue(updateChain);

    const result = await deletePost.handler({ id: 'post-1', organizationId: null, permanent: false }, adminCtx());

    expect(result).toEqual({ success: true });
    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'DELETED' }));
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('hard-deletes when permanent = true', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'post-1', organizationId: null }]));
    mockDelete.mockReturnValue(makeMutationChain());

    const result = await deletePost.handler({ id: 'post-1', organizationId: null, permanent: true }, adminCtx());

    expect(result).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalled();
  });

  it('rejects deleting a post from another tenant', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'post-1', organizationId: 'org-9' }]));

    await expect(
      deletePost.handler({ id: 'post-1', organizationId: null, permanent: false }, adminCtx()),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('publishBlogPost', () => {
  it('publishes a post and sets publishedAt', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'post-1', organizationId: null }]));
    const updateChain = makeMutationChain();
    mockUpdate.mockReturnValue(updateChain);

    const result = await publishPost.handler({ id: 'post-1', organizationId: null }, adminCtx());

    expect(result).toEqual({ success: true });
    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PUBLISHED', publishedAt: expect.any(Date) }),
    );
  });
});

describe('lockBlogPost / unlockBlogPost', () => {
  it('acquires a lock when none exists', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ id: 'post-1', organizationId: null }])) // assertPostInTenant
      .mockReturnValueOnce(makeChain([])); // no existing lock
    mockInsert.mockReturnValue(makeMutationChain());

    const result = await lockPost.handler({ id: 'post-1', organizationId: null }, adminCtx());

    expect(result.success).toBe(true);
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it('rejects locking when another user already holds an active lock', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ id: 'post-1', organizationId: null }]))
      .mockReturnValueOnce(makeChain([{ postId: 'post-1', userId: 'other-user', expiresAt: new Date(Date.now() + 60_000) }]));

    await expect(
      lockPost.handler({ id: 'post-1', organizationId: null }, adminCtx()),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('unlocks a post', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'post-1', organizationId: null }]));
    mockDelete.mockReturnValue(makeMutationChain());

    const result = await unlockPost.handler({ id: 'post-1', organizationId: null }, adminCtx());

    expect(result).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalled();
  });
});
