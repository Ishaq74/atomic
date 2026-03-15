import { auth } from '@/lib/auth';
import { getDrizzle } from '@database/drizzle';
import { auditLog, user as userTable } from '@database/schemas';
import { desc, count, gte, eq } from 'drizzle-orm';

/** Fetch all users via admin API. */
export async function fetchAdminUsers(headers: Headers) {
  const result = await auth.api.listUsers({ query: { limit: 100 }, headers });
  return (result as any)?.users ?? [];
}

/** Fetch all organizations via admin API. */
export async function fetchAdminOrgs(headers: Headers) {
  const result = await auth.api.listOrganizations({ headers });
  return result ?? [];
}

/** Fetch recent audit logs (last 50) with user names. */
export async function fetchAdminAuditLogs() {
  const db = getDrizzle();
  return db
    .select({
      id: auditLog.id,
      userId: auditLog.userId,
      userName: userTable.name,
      action: auditLog.action,
      resource: auditLog.resource,
      resourceId: auditLog.resourceId,
      ipAddress: auditLog.ipAddress,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(userTable, eq(auditLog.userId, userTable.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(50);
}

/** Fetch admin stats: total users, total orgs, recent signups. */
export async function fetchAdminStats(headers: Headers) {
  const db = getDrizzle();
  const [users, orgs] = await Promise.all([
    fetchAdminUsers(headers),
    fetchAdminOrgs(headers),
  ]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [recentCount] = await db
    .select({ value: count() })
    .from(userTable)
    .where(gte(userTable.createdAt, sevenDaysAgo));

  return {
    stats: {
      totalUsers: users.length,
      totalOrganizations: orgs.length,
      recentSignups: recentCount?.value ?? 0,
    },
    users,
    orgs,
  };
}

/** Fetch full org data by slug. Returns null if not found. */
export async function fetchOrgData(headers: Headers, orgSlug: string) {
  const fullOrg = await auth.api.getFullOrganization({
    query: { organizationSlug: orgSlug },
    headers,
  });
  if (!fullOrg) return null;

  const members = fullOrg.members ?? [];
  return { org: fullOrg, members };
}

/** Find current user's role in an org. */
export function getUserOrgRole(members: any[], userId: string): string | null {
  const member = members.find((m: any) => m.userId === userId);
  return member?.role ?? null;
}

/** Fetch pending invitations for an org (admin/owner only). */
export async function fetchOrgInvitations(headers: Headers, orgId: string) {
  const invList = await auth.api.listInvitations({
    query: { organizationId: orgId },
    headers,
  });
  return (invList ?? []).filter((inv: any) => inv.status === 'pending');
}

/** Fetch user's organizations (for dashboard). */
export async function fetchUserOrganizations(headers: Headers) {
  const result = await auth.api.listOrganizations({ headers });
  return result ?? [];
}

/** Fetch user's pending invitations (for dashboard). */
export async function fetchUserInvitations(userEmail: string) {
  const result = await auth.api.listUserInvitations({
    query: { email: userEmail },
  });
  return result ?? [];
}
