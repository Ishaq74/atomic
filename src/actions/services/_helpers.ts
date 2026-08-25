export {
  resolveServiceTenant,
  assertServicePermission,
  assertServiceInTenant,
  assertServiceCategoryInTenant,
  assertServiceTagInTenant,
  assertServiceMediaInTenant,
  hasServicePermission,
  serviceOrganizationIdSchema,
  serviceRateLimit,
} from "@/modules/services/permissions";

import { logAuditEvent, extractIp, type AuditAction } from "@/lib/audit";
import { invalidateCache } from "@database/cache";
import type { ActionAPIContext } from "astro:actions";

export function auditService(context: ActionAPIContext, userId: string, action: AuditAction, opts?: { resource?: string; resourceId?: string; metadata?: Record<string, unknown> }) {
  void logAuditEvent({ userId, action, resource: opts?.resource ?? null, resourceId: opts?.resourceId ?? null, metadata: opts?.metadata ?? null, ipAddress: extractIp(context.request.headers, context.clientAddress), userAgent: context.request.headers.get("user-agent") }).catch(() => {});
}

export function invalidateServicesCache() {
  for (const prefix of ["services:service:", "services:list:", "services:category:", "services:categories:", "services:tags:"]) invalidateCache(prefix);
}
