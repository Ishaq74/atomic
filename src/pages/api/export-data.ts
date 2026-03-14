import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getDrizzle, schema } from '@database/drizzle';
import { checkRateLimit } from '@/lib/rate-limit';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const userId = session.user.id;

  // Rate limit: 5 exports per 60 seconds per user
  const rl = checkRateLimit(`export:${userId}`, { window: 60, max: 5 });
  if (!rl.allowed) {
    return Response.json({ error: 'Trop de requêtes' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });
  }

  const db = getDrizzle();

  // Run all queries in parallel
  const [userResult, accounts, sessions, memberships, invitations] = await Promise.all([
    db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
        image: schema.user.image,
        createdAt: schema.user.createdAt,
        updatedAt: schema.user.updatedAt,
        username: schema.user.username,
        displayUsername: schema.user.displayUsername,
        role: schema.user.role,
      })
      .from(schema.user)
      .where(eq(schema.user.id, userId)),

    db
      .select({
        id: schema.account.id,
        providerId: schema.account.providerId,
        accountId: schema.account.accountId,
        createdAt: schema.account.createdAt,
      })
      .from(schema.account)
      .where(eq(schema.account.userId, userId)),

    db
      .select({
        id: schema.session.id,
        createdAt: schema.session.createdAt,
        expiresAt: schema.session.expiresAt,
        ipAddress: schema.session.ipAddress,
        userAgent: schema.session.userAgent,
      })
      .from(schema.session)
      .where(eq(schema.session.userId, userId)),

    db
      .select({
        id: schema.member.id,
        organizationId: schema.member.organizationId,
        role: schema.member.role,
        createdAt: schema.member.createdAt,
      })
      .from(schema.member)
      .where(eq(schema.member.userId, userId)),

    db
      .select({
        id: schema.invitation.id,
        organizationId: schema.invitation.organizationId,
        email: schema.invitation.email,
        role: schema.invitation.role,
        status: schema.invitation.status,
        createdAt: schema.invitation.createdAt,
      })
      .from(schema.invitation)
      .where(eq(schema.invitation.inviterId, userId)),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: userResult[0],
    accounts,
    sessions,
    memberships,
    invitations,
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="atomic-data-export.json"',
    },
  });
};
