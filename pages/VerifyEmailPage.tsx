import { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { trpc } from "../lib/trpc";
import { Shell, Message } from "./ResetPasswordPage";

// ============================================================
// Page d'atterrissage du lien de vérification d'adresse.
// URL alignée sur authEmails.ts : /auth/verifier-email?token=...
// ============================================================

function tokenFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("token") || "";
}

type State = "pending" | "ok" | "error" | "missing";

export default function VerifyEmailPage() {
  const [state, setState] = useState<State>(() => (tokenFromUrl() ? "pending" : "missing"));
  const [error, setError] = useState<string | null>(null);
  const verifyM = trpc.authLocal.verifyEmail.useMutation();

  // Le jeton est à usage unique : on garde une garde pour éviter une
  // double consommation si React remonte le composant (StrictMode).
  const consumed = useRef(false);

  useEffect(() => {
    const token = tokenFromUrl();
    if (!token || consumed.current) return;
    consumed.current = true;

    (async () => {
      try {
        await verifyM.mutateAsync({ token });
        setState("ok");
      } catch (err: any) {
        setError(err?.message || "Ce lien est invalide ou a expiré.");
        setState("error");
      }
    })();
    // Volontairement sans dépendances : la vérification ne doit
    // s'exécuter qu'une seule fois au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Shell title="Vérification de l'adresse e-mail">
      {state === "pending" && <p className="text-sm text-gray-600">Vérification en cours…</p>}

      {state === "missing" && (
        <Message type="err">
          Lien incomplet : aucun jeton n'a été trouvé dans l'adresse.
        </Message>
      )}

      {state === "ok" && (
        <div className="space-y-4">
          <Message type="ok">
            Votre adresse e-mail est confirmée. Votre compte est désormais actif.
          </Message>
          <a href="/connexion">
            <Button className="w-full">Se connecter</Button>
          </a>
        </div>
      )}

      {state === "error" && (
        <div className="space-y-4">
          <Message type="err">{error}</Message>
          <p className="text-xs text-gray-500">
            Les liens de vérification expirent au bout de 48 heures. Connectez-vous
            pour en demander un nouveau.
          </p>
          <a href="/connexion">
            <Button variant="outline" className="w-full">
              Retour à la connexion
            </Button>
          </a>
        </div>
      )}
    </Shell>
  );
}
