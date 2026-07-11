/**
 * CMS RBAC permissions — single source of truth for access control.
 *
 * TWO access-control layers:
 *   1. Global (admin plugin)  — user/session management + CMS resources
 *   2. Organization (org plugin) — org/member/invitation/team management + CMS resources
 *
 * Both share the same `statement` so permission checks are consistent.
 * Roles are defined statically here, but org owners can create additional
 * roles at runtime via better-auth's native create-role/update-role/delete-role API.
 *
 * @see https://better-auth.com/docs/plugins/admin — admin RBAC docs
 * @see https://better-auth.com/docs/plugins/organization — org RBAC docs
 */
import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements as adminDefaultStatements,
  adminAc,
} from "better-auth/plugins/admin/access";
import {
  defaultStatements as orgDefaultStatements,
  ownerAc,
  adminAc as orgAdminAc,
  memberAc,
} from "better-auth/plugins/organization/access";

// ─── Permission statements ──────────────────────────────────────────────────
// Merge both plugin default statements with CMS-specific resources.
// This gives us: user, session, organization, member, invitation, team, ac + CMS.
export const statement = {
  ...adminDefaultStatements,
  ...orgDefaultStatements,
  page: ["create", "read", "update", "delete", "publish"],
  section: ["create", "read", "update", "delete"],
  media: ["upload", "read", "delete"],
  site: ["read", "update"],
  navigation: ["read", "update"],
  audit: ["read", "export"],
  theme: ["read", "update"],
  blog: ["create", "read", "update", "delete", "publish", "moderate"],
  blogCategory: ["create", "read", "update", "delete"],
  blogTag: ["create", "read", "update", "delete"],
  blogComment: ["read", "update", "delete", "moderate"],
  blogReview: ["read", "update", "delete", "moderate"],
} as const;

export const ac = createAccessControl(statement);

// ─── Global roles (admin plugin — stored in user.role) ──────────────────────

/** Admin: full access — user/session mgmt + all CMS resources */
export const adminRole = ac.newRole({
  ...adminAc.statements,
  page: ["create", "read", "update", "delete", "publish"],
  section: ["create", "read", "update", "delete"],
  media: ["upload", "read", "delete"],
  site: ["read", "update"],
  navigation: ["read", "update"],
  audit: ["read", "export"],
  theme: ["read", "update"],
  blog: ["create", "read", "update", "delete", "publish", "moderate"],
  blogCategory: ["create", "read", "update", "delete"],
  blogTag: ["create", "read", "update", "delete"],
  blogComment: ["read", "update", "delete", "moderate"],
  blogReview: ["read", "update", "delete", "moderate"],
});

/** Editor: manages content, no user/session/site/theme management */
export const editorRole = ac.newRole({
  user: [],
  session: [],
  page: ["create", "read", "update", "delete", "publish"],
  section: ["create", "read", "update", "delete"],
  media: ["upload", "read", "delete"],
  site: ["read"],
  navigation: ["read"],
  audit: ["read"],
  theme: ["read"],
  blog: ["create", "read", "update", "delete", "publish"],
  blogCategory: ["create", "read", "update", "delete"],
  blogTag: ["create", "read", "update", "delete"],
  blogComment: ["read", "update", "moderate"],
  blogReview: ["read", "update", "moderate"],
});

/** Regular user: read-only access to CMS content */
export const userRole = ac.newRole({
  user: [],
  session: [],
  page: ["read"],
  section: ["read"],
  media: ["read"],
  site: ["read"],
  navigation: ["read"],
  theme: ["read"],
  blog: ["read"],
  blogCategory: ["read"],
  blogTag: ["read"],
  blogComment: ["read"],
  blogReview: ["read"],
});

// ─── Organization roles (org plugin — stored in member.role) ────────────────
// These extend better-auth defaults with CMS permissions relevant for org context.
// Org owners can create additional custom roles at runtime via the API.

/** Org Owner: full org control + full CMS access */
export const orgOwnerRole = ac.newRole({
  ...ownerAc.statements,
  page: ["create", "read", "update", "delete", "publish"],
  section: ["create", "read", "update", "delete"],
  media: ["upload", "read", "delete"],
  site: ["read", "update"],
  navigation: ["read", "update"],
  audit: ["read", "export"],
  theme: ["read", "update"],
  blog: ["create", "read", "update", "delete", "publish", "moderate"],
  blogCategory: ["create", "read", "update", "delete"],
  blogTag: ["create", "read", "update", "delete"],
  blogComment: ["read", "update", "delete", "moderate"],
  blogReview: ["read", "update", "delete", "moderate"],
});

/** Org Admin: org admin + content management */
export const orgAdminRole = ac.newRole({
  ...orgAdminAc.statements,
  page: ["create", "read", "update", "delete", "publish"],
  section: ["create", "read", "update", "delete"],
  media: ["upload", "read", "delete"],
  site: ["read"],
  navigation: ["read", "update"],
  audit: ["read"],
  theme: ["read"],
  blog: ["create", "read", "update", "delete", "publish", "moderate"],
  blogCategory: ["create", "read", "update", "delete"],
  blogTag: ["create", "read", "update", "delete"],
  blogComment: ["read", "update", "delete", "moderate"],
  blogReview: ["read", "update", "delete", "moderate"],
});

/** Org Member: read-only org operations + content read */
export const orgMemberRole = ac.newRole({
  ...memberAc.statements,
  page: ["read"],
  section: ["read"],
  media: ["read"],
  site: ["read"],
  navigation: ["read"],
  theme: ["read"],
  blog: ["read"],
  blogCategory: ["read"],
  blogTag: ["read"],
  blogComment: ["read"],
  blogReview: ["read"],
});
