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

vi.mock('@database/drizzle', () => ({
  getDrizzle: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  })),
}));

vi.mock('@database/schemas', () => ({
  blogPosts: { id: 'id', organizationId: 'organizationId', commentStatus: 'commentStatus', allowReviews: 'allowReviews', authorId: 'authorId', slug: 'slug', viewCount: 'viewCount' },
  blogComments: { id: 'id', postId: 'postId', authorId: 'authorId', status: 'status', content: 'content' },
  blogCommentModerations: { id: 'id', commentId: 'commentId' },
  blogPostReviews: { id: 'id', postId: 'postId', authorId: 'authorId', status: 'status', rating: 'rating' },
  blogPostReviewHelpful: { reviewId: 'reviewId', userId: 'userId', isHelpful: 'isHelpful' },
  blogPostReactions: { postId: 'postId', userId: 'userId', reactionType: 'reactionType' },
  blogPostFavorites: { postId: 'postId', userId: 'userId' },
  blogReports: { id: 'id', postId: 'postId', commentId: 'commentId', reviewId: 'reviewId', status: 'status', reporterId: 'reporterId' },
  blogNotifications: { id: 'id', userId: 'userId', isRead: 'isRead' },
  blogPostViewStats: { id: 'id', postId: 'postId' },
}));

vi.mock('@database/cache', () => ({ invalidateCache: vi.fn() }));
vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
  extractIp: vi.fn(() => '203.0.113.7'),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 10 })),
}));
vi.mock('@i18n/config', () => ({ LOCALES: ['fr', 'en', 'es', 'ar'] as const }));
const mockUserHasPermission = vi.fn(() => Promise.resolve({ success: true }));
vi.mock('@/lib/auth', () => ({
  auth: { api: { getFullOrganization: vi.fn(), userHasPermission: mockUserHasPermission } },
}));

// ── Imports ─────────────────────────────────────────────────────────
import { createBlogComment, moderateBlogComment } from '@/actions/blog/comment';
import { createBlogReview, moderateBlogReview, voteBlogReviewHelpful } from '@/actions/blog/review';
import { toggleBlogReaction, toggleBlogFavorite } from '@/actions/blog/reaction';
import { createBlogReport } from '@/actions/blog/moderation';
import { recordBlogPostView } from '@/actions/blog/view';
import { markBlogNotificationRead, markAllBlogNotificationsRead } from '@/actions/blog/notification';
import { checkRateLimit } from '@/lib/rate-limit';

const createComment = createBlogComment as unknown as { handler: (...a: any[]) => Promise<any> };
const moderateComment = moderateBlogComment as unknown as { handler: (...a: any[]) => Promise<any> };
const createReview = createBlogReview as unknown as { handler: (...a: any[]) => Promise<any> };
const moderateReview = moderateBlogReview as unknown as { handler: (...a: any[]) => Promise<any> };
const voteHelpful = voteBlogReviewHelpful as unknown as { handler: (...a: any[]) => Promise<any> };
const toggleReaction = toggleBlogReaction as unknown as { handler: (...a: any[]) => Promise<any> };
const toggleFavorite = toggleBlogFavorite as unknown as { handler: (...a: any[]) => Promise<any> };
const createReport = createBlogReport as unknown as { handler: (...a: any[]) => Promise<any> };
const recordView = recordBlogPostView as unknown as { handler: (...a: any[]) => Promise<any> };
const markRead = markBlogNotificationRead as unknown as { handler: (...a: any[]) => Promise<any> };
const markAllRead = markAllBlogNotificationsRead as unknown as { handler: (...a: any[]) => Promise<any> };

function guestCtx() {
  return { locals: {}, request: { headers: new Headers() }, clientAddress: '203.0.113.7' } as any;
}
function userCtx(id = 'user-1') {
  return {
    locals: { user: { id, banned: false }, session: { id: 'sess-1' } },
    request: { headers: new Headers() },
    clientAddress: '203.0.113.7',
  } as any;
}
function adminCtx() {
  return {
    locals: { user: { id: 'admin-1', role: 'admin', banned: false }, session: { id: 'sess-1' } },
    request: { headers: new Headers() },
    clientAddress: '203.0.113.7',
  } as any;
}

function makeChain(rows: any[]) {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
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
  mockUserHasPermission.mockReset().mockResolvedValue({ success: true });
  vi.mocked(checkRateLimit).mockReset().mockReturnValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60_000 });
});

describe('createBlogComment', () => {
  it('rejects when comments are disabled on the post', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'post-1', commentStatus: 'DISABLED', organizationId: null }]));

    await expect(
      createComment.handler({ postId: 'post-1', content: 'Hello there' }, guestCtx()),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('allows a guest comment and sanitizes its content', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ id: 'post-1', commentStatus: 'OPEN', organizationId: null }]))
      .mockReturnValueOnce(makeChain([{ authorId: 'author-1' }]));
    const insertChain = makeMutationChain([{ id: 'comment-1', status: 'PENDING' }]);
    mockInsert.mockReturnValue(insertChain);

    const result = await createComment.handler(
      { postId: 'post-1', content: 'Nice post!<script>alert(1)</script>', guestName: 'Ana', guestEmail: 'ana@example.com' },
      guestCtx(),
    );

    expect(result).toEqual({ id: 'comment-1', status: 'PENDING' });
    const insertedValues = insertChain.values.mock.calls[0][0];
    expect(insertedValues.content).not.toContain('<script>');
  });

  it('is rate-limited per IP for guests', async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });

    await expect(
      createComment.handler({ postId: 'post-1', content: 'spam' }, guestCtx()),
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });

    expect(mockSelect).not.toHaveBeenCalled();
  });
});

describe('moderateBlogComment', () => {
  it('approves a pending comment', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ id: 'comment-1', postId: 'post-1', content: 'hi', status: 'PENDING' }]))
      .mockReturnValueOnce(makeChain([{ authorId: 'guest-author' }]));
    const updateChain = makeMutationChain();
    mockUpdate.mockReturnValue(updateChain);
    mockInsert.mockReturnValue(makeMutationChain());

    const result = await moderateComment.handler(
      { commentId: 'comment-1', moderationAction: 'APPROVE', organizationId: null },
      adminCtx(),
    );

    expect(result).toEqual({ success: true });
    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'APPROVED' }));
  });
});

describe('createBlogReview', () => {
  it('requires authentication', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'post-1', allowReviews: true }]));

    await expect(
      createReview.handler({ postId: 'post-1', rating: 5, content: 'Great read' }, guestCtx()),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('rejects when reviews are disabled', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'post-1', allowReviews: false }]));

    await expect(
      createReview.handler({ postId: 'post-1', rating: 5, content: 'Great read' }, userCtx()),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('sanitizes review content before persisting (defense in depth)', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ id: 'post-1', allowReviews: true }]))
      .mockReturnValueOnce(makeChain([{ authorId: 'post-author' }]));
    const insertChain = makeMutationChain([{ id: 'review-1', status: 'PENDING' }]);
    mockInsert.mockReturnValue(insertChain);

    await createReview.handler(
      { postId: 'post-1', rating: 4, content: 'Nice<script>alert(1)</script>' },
      userCtx(),
    );

    const insertedValues = insertChain.values.mock.calls[0][0];
    expect(insertedValues.content).not.toContain('<script>');
  });

  it('is rate-limited per user', async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'post-1', allowReviews: true }]));

    await expect(
      createReview.handler({ postId: 'post-1', rating: 5, content: 'Great read' }, userCtx()),
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  });
});

describe('voteBlogReviewHelpful', () => {
  it('records a helpful vote and recalculates the count', async () => {
    mockInsert.mockReturnValue(makeMutationChain());
    mockSelect.mockReturnValueOnce(makeChain([{ helpful: 3 }]));
    mockUpdate.mockReturnValue(makeMutationChain());

    const result = await voteHelpful.handler({ reviewId: 'review-1', isHelpful: true }, userCtx());

    expect(result).toEqual({ success: true });
  });

  it('requires authentication', async () => {
    await expect(
      voteHelpful.handler({ reviewId: 'review-1', isHelpful: true }, guestCtx()),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('toggleBlogReaction', () => {
  it('adds a reaction when none exists yet', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ id: 'post-1' }]))
      .mockReturnValueOnce(makeChain([])) // no existing reaction
      .mockReturnValueOnce(makeChain([{ value: 1 }])); // updated count
    mockInsert.mockReturnValue(makeMutationChain());

    const result = await toggleReaction.handler({ postId: 'post-1', reactionType: 'LIKE' }, userCtx());

    expect(result).toEqual({ active: true, count: 1 });
  });

  it('removes an existing reaction (toggle off)', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ id: 'post-1' }]))
      .mockReturnValueOnce(makeChain([{ postId: 'post-1', userId: 'user-1', reactionType: 'LIKE' }]))
      .mockReturnValueOnce(makeChain([{ value: 0 }]));
    mockDelete.mockReturnValue(makeMutationChain());

    const result = await toggleReaction.handler({ postId: 'post-1', reactionType: 'LIKE' }, userCtx());

    expect(result).toEqual({ active: false, count: 0 });
  });

  it('is rate-limited per user', async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });

    await expect(
      toggleReaction.handler({ postId: 'post-1', reactionType: 'LIKE' }, userCtx()),
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  });
});

describe('toggleBlogFavorite', () => {
  it('requires authentication', async () => {
    await expect(
      toggleFavorite.handler({ postId: 'post-1' }, guestCtx()),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('is rate-limited per user', async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });

    await expect(
      toggleFavorite.handler({ postId: 'post-1' }, userCtx()),
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  });
});

describe('createBlogReport', () => {
  it('accepts an anonymous report and is rate-limited per IP', async () => {
    mockInsert.mockReturnValue(makeMutationChain([{ id: 'report-1' }]));

    const result = await createReport.handler({ postId: 'post-1', reason: 'SPAM' }, guestCtx());

    expect(result).toEqual({ id: 'report-1' });
  });

  it('rejects when rate-limited', async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });

    await expect(
      createReport.handler({ postId: 'post-1', reason: 'SPAM' }, guestCtx()),
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });

    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe('recordBlogPostView', () => {
  it('increments the view counter and logs a view stat row', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'post-1' }]));
    mockUpdate.mockReturnValue(makeMutationChain());
    mockInsert.mockReturnValue(makeMutationChain());

    const result = await recordView.handler({ postId: 'post-1', referrer: 'https://example.com' }, guestCtx());

    expect(result).toEqual({ recorded: true });
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
  });

  it('de-duplicates repeat views from the same IP within the cooldown window', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'post-1' }]));
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });

    const result = await recordView.handler({ postId: 'post-1' }, guestCtx());

    expect(result).toEqual({ recorded: false });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects an unknown post', async () => {
    mockSelect.mockReturnValueOnce(makeChain([]));

    await expect(recordView.handler({ postId: 'post-1' }, guestCtx())).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('notifications', () => {
  it('markBlogNotificationRead requires authentication', async () => {
    await expect(markRead.handler({ id: 'notif-1' }, guestCtx())).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('markBlogNotificationRead marks a notification read for the requesting user only', async () => {
    const updateChain = makeMutationChain();
    mockUpdate.mockReturnValue(updateChain);

    const result = await markRead.handler({ id: 'notif-1' }, userCtx('user-1'));

    expect(result).toEqual({ success: true });
    expect(updateChain.set).toHaveBeenCalledWith({ isRead: true });
  });

  it('markAllBlogNotificationsRead requires authentication', async () => {
    await expect(markAllRead.handler({}, guestCtx())).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('markAllBlogNotificationsRead marks every unread notification as read', async () => {
    mockUpdate.mockReturnValue(makeMutationChain());

    const result = await markAllRead.handler({}, userCtx('user-1'));

    expect(result).toEqual({ success: true });
  });
});
