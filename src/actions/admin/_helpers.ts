import { ActionError } from "astro:actions";
import type { ActionAPIContext } from "astro:actions";
import { logAuditEvent, extractIp, type AuditAction } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Vérifie que l'utilisateur est connecté et a le rôle admin.
 * Lance une ActionError si ce n'est pas le cas.
 * Retourne l'utilisateur typé (non-null).
 */
export function assertAdmin(context: ActionAPIContext) {
  const user = context.locals.user;
  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "Vous devez être connecté pour effectuer cette action.",
    });
  }
  if (user.role !== "admin") {
    throw new ActionError({
      code: "FORBIDDEN",
      message: "Accès réservé aux administrateurs.",
    });
  }
  if (user.banned) {
    throw new ActionError({
      code: "FORBIDDEN",
      message: "Compte suspendu.",
    });
  }
  return user;
}

/**
 * Applique un rate-limit par IP (ou userId en fallback).
 * Lance une ActionError TOO_MANY_REQUESTS si le seuil est dépassé.
 */
export function adminRateLimit(
  _context: ActionAPIContext,
  userId: string,
  scope: string,
  opts = { window: 60, max: 30 },
) {
  // Key on userId (always available after assertAdmin) to avoid NAT/shared-IP collisions.
  const rl = checkRateLimit(`admin-${scope}:${userId}`, opts);
  if (!rl.allowed) {
    throw new ActionError({
      code: "TOO_MANY_REQUESTS",
      message: "Trop de requêtes. Veuillez réessayer dans quelques instants.",
    });
  }
}

/**
 * Enregistre un événement d'audit pour une action admin.
 * Appel non-bloquant (void).
 */
export function auditAdmin(
  context: ActionAPIContext,
  userId: string,
  action: AuditAction,
  opts?: {
    resource?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  void logAuditEvent({
    userId,
    action,
    resource: opts?.resource ?? null,
    resourceId: opts?.resourceId ?? null,
    metadata: opts?.metadata ?? null,
    ipAddress: extractIp(context.request.headers),
    userAgent: context.request.headers.get("user-agent"),
  });
}
