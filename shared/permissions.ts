// ============================================================
// RBAC — définition unique des permissions.
//
// Ce fichier est partagé : le backend l'utilise pour AUTORISER,
// le frontend pour AFFICHER/MASQUER. Une seule table de vérité,
// donc aucune divergence entre ce qu'on montre et ce qu'on permet.
//
// ⚠️ Le frontend masque, il ne protège pas. Toute vérification qui
// compte est refaite côté serveur dans les routeurs tRPC.
// ============================================================

export const PERMISSIONS = [
  // Devis
  "quotes:read",
  "quotes:create",
  "quotes:update",
  "quotes:delete",
  "quotes:send",
  "quotes:sign",
  "quotes:convert", // transformer un devis en facture
  // Factures
  "invoices:read",
  "invoices:create",
  "invoices:update",
  "invoices:delete",
  "invoices:send",
  // Clients
  "clients:read",
  "clients:create",
  "clients:update",
  "clients:delete",
  // Administration
  "users:read",
  "users:manage",
  "audit:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Rôles alignés sur l'enum `users.role` existante en base. */
export type Role = "user" | "manager" | "admin";

/**
 * Attribution des permissions par rôle.
 *
 * - `user`     : client final — consulte uniquement ses propres documents
 * - `manager`  : agent commercial — gère devis et clients, consulte les factures
 * - `admin`    : accès complet, y compris administration et journal d'audit
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  user: ["quotes:read", "invoices:read"],

  manager: [
    "quotes:read", "quotes:create", "quotes:update", "quotes:send",
    "quotes:sign", "quotes:convert",
    "invoices:read", "invoices:send",
    "clients:read", "clients:create", "clients:update",
  ],

  admin: [...PERMISSIONS],
};

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const granted = ROLE_PERMISSIONS[role];
  return Boolean(granted && granted.includes(permission));
}

export function hasAnyPermission(
  role: Role | null | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Les rôles `user` ne voient que leurs propres documents. Les autres
 * rôles voient tout. Centralisé ici pour que routeurs et UI appliquent
 * exactement la même règle.
 */
export function canOnlySeeOwnDocuments(role: Role | null | undefined): boolean {
  return role === "user" || !role;
}

export const ROLE_LABELS: Record<Role, string> = {
  user: "Client",
  manager: "Agent commercial",
  admin: "Administrateur",
};
