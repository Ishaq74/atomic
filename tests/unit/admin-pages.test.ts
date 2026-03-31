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
  pages: { id: 'id', updatedAt: 'updatedAt' },
}));

vi.mock('@database/cache', () => ({ invalidateCache: vi.fn() }));
vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
  extractIp: vi.fn(() => '127.0.0.1'),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 10 })),
}));
vi.mock('@i18n/config', () => ({ LOCALES: ['fr', 'en', 'es', 'ar'] as const }));

// ── Imports ─────────────────────────────────────────────────────────
import {
  createPage as _create,
  updatePage as _update,
  deletePage as _del,
  publishPage as _publish,
} from '@/actions/admin/pages';

const createPage = _create as unknown as { handler: (...a: any[]) => Promise<any> };
const updatePage = _update as unknown as { handler: (...a: any[]) => Promise<any> };
const deletePage = _del as unknown as { handler: (...a: any[]) => Promise<any> };
const publishPage = _publish as unknown as { handler: (...a: any[]) => Promise<any> };

function adminCtx() {
  return {
    locals: { user: { id: 'admin-1', role: 'admin', email: 'a@test.com' } },
    request: { headers: new Headers() },
    clientAddress: '127.0.0.1',
  } as any;
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
function insertChain(rows: any[]) {
  return { values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(rows) }) };
}
function updateChain(rows: any[]) {
  const terminal: any = Object.assign(Promise.resolve(rows), {
    returning: vi.fn().mockResolvedValue(rows),
  });
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(terminal),
    }),
  };
}
function deleteChain(rows: any[]) {
  const terminal: any = Object.assign(Promise.resolve(rows), {
    returning: vi.fn().mockResolvedValue(rows),
  });
  return { where: vi.fn().mockReturnValue(terminal) };
}

beforeEach(() => {
  mockSelect.mockReset();
  mockInsert.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
});

// ─── createPage ─────────────────────────────────────────────────────

describe('createPage', () => {
  it('creates a page', async () => {
    const created = { id: 'p1', slug: 'about', title: 'About', locale: 'fr' };
    mockInsert.mockReturnValue(insertChain([created]));

    const result = await createPage.handler(
      { slug: 'about', title: 'About', locale: 'fr' },
      adminCtx(),
    );
    expect(result).toEqual(created);
  });

  it('throws CONFLICT on duplicate slug', async () => {
    const dbError = new Error('dup') as any;
    dbError.code = '23505';
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: vi.fn().mockRejectedValue(dbError) }),
    });

    await expect(
      createPage.handler({ slug: 'about', title: 'About', locale: 'fr' }, adminCtx()),
    ).rejects.toThrow('existe déjà');
  });

  it('throws on reserved slug', async () => {
    await expect(
      createPage.handler({ slug: 'admin', title: 'Admin', locale: 'fr' }, adminCtx()),
    ).rejects.toThrow('réservé');
  });

  it('rejects non-admin', async () => {
    const ctx = {
      locals: { user: { id: 'u1', role: 'user' } },
      request: { headers: new Headers() },
    } as any;
    await expect(
      createPage.handler({ slug: 'x', title: 'X', locale: 'fr' }, ctx),
    ).rejects.toThrow('administrateurs');
  });
});

// ─── updatePage ─────────────────────────────────────────────────────

describe('updatePage', () => {
  it('updates a page', async () => {
    const updated = { id: 'p1', title: 'Updated' };
    mockUpdate.mockReturnValue(updateChain([updated]));

    const result = await updatePage.handler(
      { id: 'p1', title: 'Updated' },
      adminCtx(),
    );
    expect(result).toEqual(updated);
  });

  it('throws NOT_FOUND when page missing', async () => {
    mockUpdate.mockReturnValue(updateChain([]));
    mockSelect.mockReturnValueOnce(selectChain([]));

    await expect(
      updatePage.handler({ id: 'nope', title: 'x' }, adminCtx()),
    ).rejects.toThrow('introuvable');
  });

  it('throws CONFLICT on optimistic lock failure', async () => {
    mockUpdate.mockReturnValue(updateChain([]));
    mockSelect.mockReturnValueOnce(selectChain([{ id: 'p1' }]));

    await expect(
      updatePage.handler(
        { id: 'p1', title: 'x', expectedUpdatedAt: '2024-01-01T00:00:00Z' },
        adminCtx(),
      ),
    ).rejects.toThrow('modifiée par un autre');
  });

  it('throws CONFLICT on duplicate slug during update', async () => {
    const dbError = new Error('dup') as any;
    dbError.code = '23505';
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: vi.fn().mockRejectedValue(dbError) }),
      }),
    });

    await expect(
      updatePage.handler({ id: 'p1', slug: 'taken' }, adminCtx()),
    ).rejects.toThrow('utilise déjà');
  });

  it('throws on reserved slug during update', async () => {
    await expect(
      updatePage.handler({ id: 'p1', slug: 'api' }, adminCtx()),
    ).rejects.toThrow('réservé');
  });
});

// ─── deletePage ─────────────────────────────────────────────────────

describe('deletePage', () => {
  it('deletes a page', async () => {
    mockDelete.mockReturnValue(deleteChain([{ id: 'p1', title: 'About' }]));

    const result = await deletePage.handler({ id: 'p1' }, adminCtx());
    expect(result).toEqual({ success: true });
  });

  it('throws NOT_FOUND when page missing', async () => {
    mockDelete.mockReturnValue(deleteChain([]));

    await expect(
      deletePage.handler({ id: 'nope' }, adminCtx()),
    ).rejects.toThrow('introuvable');
  });
});

// ─── publishPage ────────────────────────────────────────────────────

describe('publishPage', () => {
  it('publishes a page', async () => {
    const updated = { id: 'p1', isPublished: true };
    mockUpdate.mockReturnValue(updateChain([updated]));

    const result = await publishPage.handler(
      { id: 'p1', isPublished: true },
      adminCtx(),
    );
    expect(result).toEqual(updated);
  });

  it('unpublishes a page', async () => {
    const updated = { id: 'p1', isPublished: false };
    mockUpdate.mockReturnValue(updateChain([updated]));

    const result = await publishPage.handler(
      { id: 'p1', isPublished: false },
      adminCtx(),
    );
    expect(result).toEqual(updated);
  });

  it('throws NOT_FOUND when page missing', async () => {
    mockUpdate.mockReturnValue(updateChain([]));

    await expect(
      publishPage.handler({ id: 'nope', isPublished: true }, adminCtx()),
    ).rejects.toThrow('introuvable');
  });
});
