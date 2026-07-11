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
  blogSubscribers: {
    id: 'id',
    organizationId: 'organizationId',
    email: 'email',
    locale: 'locale',
    token: 'token',
    status: 'status',
    confirmedAt: 'confirmedAt',
    unsubscribedAt: 'unsubscribedAt',
  },
}));

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
  extractIp: vi.fn(() => '203.0.113.7'),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 10 })),
}));
vi.mock('@smtp/send', () => ({ sendEmail: vi.fn(() => Promise.resolve()) }));
vi.mock('@smtp/templates/blog-newsletter', () => ({
  blogNewsletterConfirmTemplate: vi.fn(() => ({
    subject: 'Confirm',
    html: '<p>confirm</p>',
    text: 'confirm',
  })),
  blogNewsletterUnsubscribeTemplate: vi.fn(() => ({
    subject: 'Unsubscribe',
    html: '<p>unsub</p>',
    text: 'unsub',
  })),
}));
vi.mock('@i18n/config', () => ({ LOCALES: ['fr', 'en', 'es', 'ar'] as const }));

import { subscribeBlogNewsletter, confirmBlogSubscription, unsubscribeBlogNewsletter } from '@/actions/blog/subscription';

const subscribe = subscribeBlogNewsletter as unknown as { handler: (...a: any[]) => Promise<any> };
const confirm = confirmBlogSubscription as unknown as { handler: (...a: any[]) => Promise<any> };
const unsubscribe = unsubscribeBlogNewsletter as unknown as { handler: (...a: any[]) => Promise<any> };

function guestCtx() {
  return {
    locals: {},
    request: { headers: new Headers(), url: 'http://localhost:4321/api/blog/newsletter/confirm' },
    clientAddress: '203.0.113.7',
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockReturnValue({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) });
  mockInsert.mockReturnValue({ values: () => ({ returning: () => Promise.resolve([{ id: 'sub-1' }]) }) });
  mockUpdate.mockReturnValue({ set: () => ({ where: () => Promise.resolve([]) }) });
});

describe('blog newsletter subscription', () => {
  it('subscribes a new email with a token and sends confirmation email', async () => {
    const res = await subscribe.handler(
      { email: 'test@example.com', locale: 'fr', organizationId: null },
      guestCtx(),
    );
    expect(res.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('re-subscribes an existing email (resets to PENDING)', async () => {
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: 'sub-1', status: 'CONFIRMED' }]),
        }),
      }),
    });
    const res = await subscribe.handler(
      { email: 'test@example.com', locale: 'en', organizationId: null },
      guestCtx(),
    );
    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('confirms a subscription by token', async () => {
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: 'sub-1', status: 'PENDING' }]),
        }),
      }),
    });
    const res = await confirm.handler({ token: 'tok-123' }, guestCtx());
    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes a subscription by token', async () => {
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: 'sub-1', status: 'CONFIRMED' }]),
        }),
      }),
    });
    const res = await unsubscribe.handler({ token: 'tok-123' }, guestCtx());
    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});
