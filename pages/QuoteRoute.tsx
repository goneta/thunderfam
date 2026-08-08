import { useAuth } from "@/_core/hooks/useAuth";
import { hasPermission, type Role } from "@shared/permissions";
import QuoteEditor from "./QuoteEditor";
import QuoteDetail from "./QuoteDetail";

// ============================================================
// Aiguillage de /devis/:id.
//
// Un client (rôle « user ») a quotes:read mais pas quotes:update :
// lui présenter l'éditeur l'inviterait à saisir des modifications
// que le serveur refuserait ensuite. On décide donc de l'écran à
// partir de la MÊME matrice de permissions que celle appliquée
// côté serveur, plutôt que d'un test de rôle en dur.
//
// Ce n'est pas une protection : le cloisonnement réel est fait par
// les routeurs (`assertCanAccessDocument`). C'est une cohérence
// d'interface — ne montrer que ce qui est réellement permis.
// ============================================================

export default function QuoteRoute() {
  const { user } = useAuth();
  const role = (user?.role ?? null) as Role | null;

  return hasPermission(role, "quotes:update") ? <QuoteEditor /> : <QuoteDetail />;
}
