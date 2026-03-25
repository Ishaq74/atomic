import { auth } from '@/lib/auth';
import { getDrizzle } from '@database/drizzle';
import { auditLog, user as userTable, organization as orgTable } from '@database/schemas';
import { desc, count, gte, eq, and, lte, type SQL } from 'drizzle-orm';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  createdAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

/** Full organization data from getFullOrganization API. */
export type FullOrganization = NonNullable<Awaited<ReturnType<typeof auth.api.getFullOrganization>>>;

/** Audit log row as returned by fetchAdminAuditLogs. */
export interface AuditLogRow {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: Date | null;
}

/** Fetch users via admin API with pagination. */
export async function fetchAdminUsers(
  headers: Headers,
  opts: { limit?: number; offset?: number } = {},
): Promise<{ users: AdminUser[]; total: number }> {
  const session = await auth.api.getSession({ headers });
  if (!session || session.user.role !== 'admin') {
    throw new Error('Unauthorized: admin access required');
  }
  const limit = Math.max(1, Math.min(opts.limit ?? 25, 100));
  const offset = Math.max(0, opts.offset ?? 0);
  const result = await auth.api.listUsers({
    query: { limit, offset },
    headers,
  });
  const rawUsers = result?.users ?? [];
  const users: AdminUser[] = rawUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role ?? null,
    banned: u.banned ?? null,
    createdAt: u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt),
  }));
  const total = typeof (result as Record<string, unknown>)?.total === 'number'
    ? (result as Record<string, unknown>).total as number
    : users.length;
  return {
    users,
    total: total ?? users.length,
  };
}

/** Fetch organizations via admin API with pagination. */
export async function fetchAdminOrgs(
  headers: Headers,
  opts: { limit?: number; offset?: number } = {},
): Promise<Organization[]> {
  const session = await auth.api.getSession({ headers });
  if (!session || session.user.role !== 'admin') {
    throw new Error('Unauthorized: admin access required');
  }
  const result = await auth.api.listOrganizations({
    query: { limit: Math.max(1, Math.min(opts.limit ?? 25, 100)), offset: Math.max(0, opts.offset ?? 0) },
    headers,
  });
  return (result ?? []) as Organization[];
}

export interface AuditFilters {
  action?: string;
  userId?: string;
  from?: Date;
  to?: Date;
}

/** Fetch audit logs with pagination and optional filters. Requires admin auth. */
export async function fetchAdminAuditLogs(
  headers: Headers,
  page = 1,
  perPage = 25,
  filters: AuditFilters = {},
) {
  // Defense-in-depth: verify caller is admin
  const session = await auth.api.getSession({ headers });
  if (!session || session.user.role !== 'admin') {
    throw new Error('Unauthorized: admin access required');
  }

  const safePage = Math.max(1, Math.min(page, 500));
  const safePerPage = Math.max(1, Math.min(perPage, 100));
  const db = getDrizzle();
  const offset = (safePage - 1) * safePerPage;

  // Build dynamic where conditions
  const conditions: SQL[] = [];
  if (filters.action) conditions.push(eq(auditLog.action, filters.action));
  if (filters.userId) conditions.push(eq(auditLog.userId, filters.userId));
  if (filters.from) conditions.push(gte(auditLog.createdAt, filters.from));
  if (filters.to) conditions.push(lte(auditLog.createdAt, filters.to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [total]] = await Promise.all([
    db
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
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(safePerPage)
      .offset(offset),
    db.select({ value: count() }).from(auditLog).where(where),
  ]);

  return { rows, total: total?.value ?? 0 };
}

/** Fetch admin stats: total users, total orgs, recent signups. */
export async function fetchAdminStats(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session || session.user.role !== 'admin') {
    throw new Error('Unauthorized: admin access required');
  }
  const db = getDrizzle();
  const [[userCount], [orgCount], [recentCount]] = await Promise.all([
    db.select({ value: count() }).from(userTable),
    db.select({ value: count() }).from(orgTable),
    db
      .select({ value: count() })
      .from(userTable)
      .where(gte(userTable.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))),
  ]);

  const [usersResult, orgs] = await Promise.all([
    fetchAdminUsers(headers, { limit: 25 }),
    fetchAdminOrgs(headers, { limit: 25 }),
  ]);

  return {
    stats: {
      totalUsers: userCount?.value ?? 0,
      totalOrganizations: orgCount?.value ?? 0,
      recentSignups: recentCount?.value ?? 0,
    },
    users: usersResult.users,
    orgs,
  };
}

/** Fetch full org data by slug. Returns null if not found.
 *  Verifies that the caller is a member of the organization. */
export async function fetchOrgData(headers: Headers, orgSlug: string) {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new Error('Unauthorized: authentication required');

  const fullOrg = await auth.api.getFullOrganization({
    query: { organizationSlug: orgSlug },
    headers,
  });
  if (!fullOrg) return null;

  const members = fullOrg.members ?? [];

  // Verify the caller is a member of this organization
  const callerRole = getUserOrgRole(members as OrgMember[], session.user.id);
  if (!callerRole && session.user.role !== 'admin') {
    throw new Error('Unauthorized: you are not a member of this organization');
  }
  return { org: fullOrg, members };
}

export interface OrgMember {
  userId: string;
  role: string;
}

/** Find current user's role in an org. */
export function getUserOrgRole(members: OrgMember[], userId: string): string | null {
  const member = members.find((m) => m.userId === userId);
  return member?.role ?? null;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  inviterId: string;
}

/** Fetch pending invitations for an org (admin/owner only). */
export async function fetchOrgInvitations(headers: Headers, orgId: string) {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new Error('Unauthorized: authentication required');

  // Verify the caller is a member of this organization (or global admin)
  const fullOrg = await auth.api.getFullOrganization({
    query: { organizationId: orgId },
    headers,
  });
  if (!fullOrg) throw new Error('Organization not found');
  const callerRole = getUserOrgRole((fullOrg.members ?? []) as OrgMember[], session.user.id);
  if (!callerRole && session.user.role !== 'admin') {
    throw new Error('Unauthorized: you are not a member of this organization');
  }

  const invList = await auth.api.listInvitations({
    query: { organizationId: orgId },
    headers,
  });
  return ((invList ?? []) as Invitation[]).filter((inv) => inv.status === 'pending');
}

/** Fetch user's organizations (for dashboard). */
export async function fetchUserOrganizations(headers: Headers) {
  const result = await auth.api.listOrganizations({ headers });
  return result ?? [];
}

/** Fetch user's pending invitations (for dashboard).
 *  Requires authenticated headers — only returns invitations for the caller's own email. */
export async function fetchUserInvitations(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new Error('Unauthorized: authentication required');

  const result = await auth.api.listUserInvitations({
    query: { email: session.user.email },
    headers,
  });
  return result ?? [];
}
