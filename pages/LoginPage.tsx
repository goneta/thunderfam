import { useState } from "react";
import { Button } from "../components/ui/button";
import { trpc } from "../lib/trpc";

// ============================================================
// Connexion / inscription par mot de passe.
//
// Complète l'authentification OAuth existante, sans la remplacer :
// ce routeur est monté sous `authLocal`, `auth` restant réservé à
// l'OAuth Manus.
//
// L'access token n'est jamais écrit dans localStorage (accessible
// au JavaScript, donc exfiltrable par une faille XSS) : il reste en
// mémoire. Le refresh token, lui, voyage dans un cookie httpOnly
// posé par le serveur.
// ============================================================

type Mode = "login" | "register" | "forgot";

/** Jeton d'accès conservé en mémoire uniquement, jamais persisté. */
let accessTokenInMemory: string | null = null;
export function getAccessToken() {
  return accessTokenInMemory;
}
export function setAccessToken(token: string | null) {
  accessTokenInMemory = token;
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const loginM = trpc.authLocal.login.useMutation();
  const registerM = trpc.authLocal.register.useMutation();
  const forgotM = trpc.authLocal.forgotPassword.useMutation();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const res: any = await loginM.mutateAsync({ email, password });
        if (res?.accessToken) setAccessToken(res.accessToken);
        setFeedback({ type: "ok", text: "Connexion réussie." });
        if (res?.accessToken) window.location.href = "/portal";
      } else if (mode === "register") {
        await registerM.mutateAsync({ email, password, name });
        setFeedback({
          type: "ok",
          text: "Compte créé. Consultez votre boîte e-mail pour confirmer votre adresse.",
        });
      } else {
        await forgotM.mutateAsync({ email });
        // Message volontairement identique que le compte existe ou non :
        // révéler la différence permettrait d'énumérer les comptes.
        setFeedback({
          type: "ok",
          text: "Si un compte existe pour cette adresse, un e-mail vient d'être envoyé.",
        });
      }
    } catch (err: any) {
      setFeedback({ type: "err", text: err?.message || "Une erreur est survenue." });
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Mode, string> = {
    login: "Connexion",
    register: "Créer un compte",
    forgot: "Mot de passe oublié",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-navy px-6 py-5 text-white">
            <h1 className="text-xl font-bold">{titles[mode]}</h1>
            <p className="mt-1 text-xs opacity-80">Thunderfam Group Limited Côte d'Ivoire</p>
          </div>
          <div className="h-1 bg-gradient-to-r from-blue-500 via-red-500 to-green-500" />

          <form onSubmit={submit} className="space-y-4 p-6">
            {mode === "register" && (
              <Field label="Nom complet">
                <input
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </Field>
            )}

            <Field label="Adresse e-mail">
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </Field>

            {mode !== "forgot" && (
              <Field label="Mot de passe">
                <input
                  className={inputClass}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                {mode === "register" && (
                  <p className="mt-1 text-xs text-gray-500">
                    Au moins 10 caractères, dont une lettre et un chiffre.
                  </p>
                )}
              </Field>
            )}

            {feedback && (
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  feedback.type === "ok"
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {feedback.text}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy
                ? "Veuillez patienter…"
                : mode === "login"
                ? "Se connecter"
                : mode === "register"
                ? "Créer mon compte"
                : "Envoyer le lien"}
            </Button>

            <div className="space-y-1 pt-2 text-center text-sm">
              {mode === "login" && (
                <>
                  <button type="button" onClick={() => setMode("forgot")} className={linkClass}>
                    Mot de passe oublié ?
                  </button>
                  <div>
                    <span className="text-gray-500">Pas encore de compte ? </span>
                    <button type="button" onClick={() => setMode("register")} className={linkClass}>
                      Créer un compte
                    </button>
                  </div>
                </>
              )}
              {mode !== "login" && (
                <button type="button" onClick={() => setMode("login")} className={linkClass}>
                  ← Retour à la connexion
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gold focus:outline-none";
const linkClass = "text-blue-600 hover:underline";

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
