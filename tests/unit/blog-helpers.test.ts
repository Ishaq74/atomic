import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('astro:actions', () => {
  class ActionError extends Error {
    code: string;
    constructor({ code, message }: { code: string; message: string }) {
      super(message);
      this.code = code;
    }
  }

  return { ActionError };
});

const mockSelect = vi.fn();
const mockGetFullOrganization = vi.fn();
const mockUserHasPermission = vi.fn();

vi.mock('@database/drizzle', () => ({
  getDrizzle: vi.fn(() => ({
    select: mockSelect,
  })),
}));

vi.mock('@database/schemas', () => ({
  blogPosts: { id: 'id', organizationId: 'organizationId' },
  blogCategories: { id: 'id', organizationId: 'organizationId' },
  blogTags: { id: 'id', organizationId: 'organizationId' },
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getFullOrganization: mockGetFullOrganization,
      userHasPermission: mockUserHasPermission,
    },
  },
}));

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
  extractIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 10 })),
}));

import {
  assertBlogPermission,
  assertCategoryInTenant,
  assertPostInTenant,
  assertTagInTenant,
  resolveBlogTenant,
} from '@/actions/blog/_helpers';

function fakeContext(user: any = null): any {
  return {
    locals: { user },
    request: { headers: new Headers() },
    clientAddress: '127.0.0.1',
  };
}

function selectChain(rows: any[]) {
  const terminal: any = Object.assign(Promise.resolve(rows), {
    limit: vi.fn().mockResolvedValue(rows),
  });

  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(terminal),
    }),
  };
}

beforeEach(() => {
  mockSelect.mockReset();
  mockGetFullOrganization.mockReset();
  mockUserHasPermission.mockReset();
  mockUserHasPermission.mockResolvedValue({ success: true });
});

describe('resolveBlogTenant', () => {
  it('returns global context when organizationId is missing', () => {
    expect(resolveBlogTenant({})).toEqual({
      organizationId: null,
      isOrgContext: false,
    });
  });

  it('returns org context when organizationId is present', () => {
    expect(resolveBlogTenant({ organizationId: 'org-1' })).toEqual({
      organizationId: 'org-1',
      isOrgContext: true,
    });
  });
});

describe('assertBlogPermission', () => {
  it('throws UNAUTHORIZED when user is missing', async () => {
    await expect(
      assertBlogPermission(fakeContext(null), { organizationId: null, isOrgContext: false }, { blog: ['read'] }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('returns the global admin without org lookup or RBAC call', async () => {
    const user = { id: 'admin-1', role: 'admin', banned: false };

    const result = await assertBlogPermission(
      fakeContext(user),
      { organizationId: 'org-1', isOrgContext: true },
      { blog: ['delete'] },
    );

    expect(result).toBe(user);
    expect(mockGetFullOrganization).not.toHaveBeenCalled();
    expect(mockUserHasPermission).not.toHaveBeenCalled();
  });

  it('rejects a non-admin org member in org context', async () => {
    mockGetFullOrganization.mockResolvedValueOnce({
      members: [{ userId: 'user-1', role: 'member' }],
    });

    await expect(
      assertBlogPermission(
        fakeContext({ id: 'user-1', role: 'user', banned: false }),
        { organizationId: 'org-1', isOrgContext: true },
        { blog: ['update'] },
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    expect(mockUserHasPermission).not.toHaveBeenCalled();
  });

  it('allows an org admin in org context when RBAC passes', async () => {
    mockGetFullOrganization.mockResolvedValueOnce({
      members: [{ userId: 'user-1', role: 'admin' }],
    });

    const user = { id: 'user-1', role: 'user', banned: false };
    const result = await assertBlogPermission(
      fakeContext(user),
      { organizationId: 'org-1', isOrgContext: true },
      { blog: ['publish'] },
    );

    expect(result).toBe(user);
    expect(mockGetFullOrganization).toHaveBeenCalledOnce();
    expect(mockUserHasPermission).toHaveBeenCalledWith({
      body: {
        userId: 'user-1',
        permissions: { blog: ['publish'] },
      },
    });
  });

  it('rejects when RBAC denies the requested blog permission', async () => {
    mockUserHasPermission.mockResolvedValueOnce({ success: false });

    await expect(
      assertBlogPermission(
        fakeContext({ id: 'editor-1', role: 'editor', banned: false }),
        { organizationId: null, isOrgContext: false },
        { blogReview: ['moderate'] },
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('tenant resource guards', () => {
  it('allows a post when its tenant matches', async () => {
    const row = { id: 'post-1', organizationId: 'org-1' };
    mockSelect.mockReturnValueOnce(selectChain([row]));

    await expect(
      assertPostInTenant('post-1', { organizationId: 'org-1', isOrgContext: true }),
    ).resolves.toEqual(row);
  });

  it('rejects a post from another tenant', async () => {
    mockSelect.mockReturnValueOnce(selectChain([{ id: 'post-2', organizationId: 'org-2' }]));

    await expect(
      assertPostInTenant('post-2', { organizationId: 'org-1', isOrgContext: true }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('allows a global category in the global tenant', async () => {
    const row = { id: 'cat-1', organizationId: null };
    mockSelect.mockReturnValueOnce(selectChain([row]));

    await expect(
      assertCategoryInTenant('cat-1', { organizationId: null, isOrgContext: false }),
    ).resolves.toEqual(row);
  });

  it('rejects an org tag from the global tenant', async () => {
    mockSelect.mockReturnValueOnce(selectChain([{ id: 'tag-1', organizationId: 'org-9' }]));

    await expect(
      assertTagInTenant('tag-1', { organizationId: null, isOrgContext: false }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});