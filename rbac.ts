import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";
import { hasPermission, canOnlySeeOwnDocuments, type Permission, type Role } from "@shared/permissions";
import { logAuthEvent } from "./authService";

// ============================================================
// Contrôle d'accès côté serveur.
//
// Le frontend masque les actions interdites, mais c'est ICI que
// l'autorisation est réellement appliquée : une requête forgée à
// la main est refusée de la même façon.
//
// Chaque refus est journalisé (permission_denied) pour l'audit.
// ============================================================

/**
 * Procédure exigeant une permission précise.
 *
 * Exemple :
 *   const createQuote = permissionProcedure("quotes:create").mutation(...)
 */
export function permissionProcedure(permission: Permission) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const role = (ctx.user?.role ?? null) as Role | null;

    if (!hasPermission(role, permission)) {
      await logAuthEvent({
        userId: ctx.user?.id ?? null,
        email: ctx.user?.email ?? null,
        event: "permission_denied",
        detail: `Permission requise : ${permission} (rôle : ${role ?? "aucun"})`,
      });
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Vous n'avez pas les droits nécessaires pour cette action.",
      });
    }

    return next({ ctx });
  });
}

/**
 * Restriction de portée : un utilisateur de rôle `user` ne voit que
 * ses propres documents. Renvoie l'identifiant à filtrer, ou null
 * si le rôle a le droit de tout voir.
 *
 * À utiliser systématiquement dans les requêtes de lecture, sinon
 * un client pourrait lister les devis des autres.
 */
export function ownershipFilter(ctx: { user?: { id: number; role?: string } | null }): number | null {
  const role = (ctx.user?.role ?? null) as Role | null;
  return canOnlySeeOwnDocuments(role) ? ctx.user?.id ?? -1 : null;
}

/**
 * Vérifie qu'un document appartient bien à l'utilisateur lorsque son
 * rôle l'y contraint. Lève NOT_FOUND (et non FORBIDDEN) afin de ne
 * pas révéler l'existence d'un document appartenant à un tiers.
 */
export function assertCanAccessDocument(
  ctx: { user?: { id: number; role?: string } | null },
  doc: { userId: number } | null | undefined
): void {
  if (!doc) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Document introuvable." });
  }
  const restrictTo = ownershipFilter(ctx);
  if (restrictTo !== null && doc.userId !== restrictTo) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Document introuvable." });
  }
}
