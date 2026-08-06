import { useState } from "react";
import { Button } from "../components/ui/button";
import { trpc } from "../lib/trpc";

// ============================================================
// Page d'atterrissage du lien de réinitialisation.
//
// L'URL doit correspondre EXACTEMENT à celle construite dans
// authEmails.ts : /auth/reinitialiser?token=...
// ============================================================

function tokenFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("token") || "";
}

export default function ResetPasswordPage() {
  const [token] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetM = trpc.authLocal.resetPassword.useMutation();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Vérification côté client pour un retour immédiat ; le serveur
    // applique de toute façon ses propres règles de robustesse.
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      await resetM.mutateAsync({ token, password });
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Ce lien est invalide ou a expiré.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Réinitialisation du mot de passe">
      {!token && (
        <Message type="err">
          Lien incomplet : aucun jeton n'a été trouvé dans l'adresse.
          Refaites une demande depuis la page de connexion.
        </Message>
      )}

      {done ? (
        <div className="space-y-4">
          <Message type="ok">
            Votre mot de passe a été modifié. Toutes vos sessions ont été
            déconnectées par sécurité.
          </Message>
          <a href="/connexion">
            <Button className="w-full">Se connecter</Button>
          </a>
        </div>
      ) : (
        token && (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nouveau mot de passe">
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-gray-500">
                Au moins 10 caractères, dont une lettre et un chiffre.
              </p>
            </Field>
            <Field label="Confirmer le mot de passe">
              <input
                className={inputClass}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </Field>
            {error && <Message type="err">{error}</Message>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Veuillez patienter…" : "Valider le nouveau mot de passe"}
            </Button>
          </form>
        )
      )}
    </Shell>
  );
}

// ---------- Éléments partagés avec VerifyEmailPage ----------

export function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-navy px-6 py-5 text-white">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="mt-1 text-xs opacity-80">Thunderfam Group Limited Côte d'Ivoire</p>
        </div>
        <div className="h-1 bg-gradient-to-r from-blue-500 via-red-500 to-green-500" />
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Message({ type, children }: { type: "ok" | "err"; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-lg px-3 py-2 text-sm ${
        type === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
      }`}
    >
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gold focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}
