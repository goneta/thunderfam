import { COMPANY_INFO } from "@shared/documents";
import { sendMail, isEmailConfigured, escapeHtml } from "./emailService";

// ============================================================
// E-mails d'authentification : vérification d'adresse et
// réinitialisation de mot de passe.
//
// Le transport SMTP et l'échappement HTML sont mutualisés avec
// emailService.ts : une seule configuration, un seul transporteur.
// Seuls les gabarits diffèrent — ces messages ne portent jamais de
// pièce jointe et ne divulguent jamais l'existence d'un compte.
// ============================================================

/** Conservé pour compatibilité : la configuration SMTP est commune. */
export const isAuthEmailConfigured = isEmailConfigured;

/** URL publique du site, utilisée pour construire les liens des e-mails. */
function baseUrl(): string {
  return (process.env.PUBLIC_APP_URL || "https://thunderfam.com").replace(/\/$/, "");
}

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr"><body style="margin:0;padding:0;background:#f7f7f8;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#111">
  <div style="max-width:600px;margin:0 auto;background:#fff">
    <div style="background:#0A0A0A;padding:18px 24px;color:#fff">
      <div style="font-size:15px;font-weight:700">${escapeHtml(COMPANY_INFO.name)}</div>
      <div style="font-size:11px;opacity:.8">RCCM : ${escapeHtml(COMPANY_INFO.rccm)}</div>
    </div>
    <div style="height:4px;background:linear-gradient(90deg,#3B7DDD 25%,#E74C3C 25% 50%,#F2B705 50% 75%,#27AE60 75%)"></div>
    <div style="padding:28px 24px">
      <h1 style="margin:0 0 18px;font-size:19px">${escapeHtml(title)}</h1>
      ${bodyHtml}
    </div>
    <div style="padding:16px 24px;background:#f4f4f4;font-size:11px;color:#666">
      ${escapeHtml(COMPANY_INFO.address)} — ${escapeHtml(COMPANY_INFO.addressLine2)}<br/>
      Tél. : ${escapeHtml(COMPANY_INFO.phone1)}
    </div>
  </div>
</body></html>`;
}

function ctaButton(url: string, label: string): string {
  return `<p style="margin:24px 0">
    <a href="${url}" style="display:inline-block;background:#F2B705;color:#0A0A0A;text-decoration:none;
       padding:12px 24px;border-radius:6px;font-weight:700;font-size:14px">${escapeHtml(label)}</a>
  </p>
  <p style="margin:0 0 8px;font-size:12px;color:#666">
    Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
    <span style="word-break:break-all;color:#3B7DDD">${url}</span>
  </p>`;
}

/**
 * E-mail de vérification d'adresse.
 * Le jeton est valable 48 h et à usage unique.
 */
export async function sendVerificationEmail(to: string, token: string, name?: string | null): Promise<void> {
  const url = `${baseUrl()}/auth/verifier-email?token=${encodeURIComponent(token)}`;
  const html = layout(
    "Confirmez votre adresse e-mail",
    `<p style="margin:0 0 12px;font-size:14px">Bonjour${name ? ` ${escapeHtml(name)}` : ""},</p>
     <p style="margin:0 0 12px;font-size:14px">
       Confirmez votre adresse e-mail pour activer votre accès à l'espace Thunderfam.
     </p>
     ${ctaButton(url, "Confirmer mon adresse")}
     <p style="margin:16px 0 0;font-size:12px;color:#666">
       Ce lien expire dans 48 heures. Si vous n'êtes pas à l'origine de cette demande,
       vous pouvez ignorer ce message.
     </p>`
  );

  await sendMail({ to, subject: "Confirmez votre adresse e-mail — Thunderfam Group", html });
}

/**
 * E-mail de réinitialisation de mot de passe.
 * Le jeton est valable 1 h et à usage unique.
 */
export async function sendPasswordResetEmail(to: string, token: string, name?: string | null): Promise<void> {
  const url = `${baseUrl()}/auth/reinitialiser?token=${encodeURIComponent(token)}`;
  const html = layout(
    "Réinitialisation de votre mot de passe",
    `<p style="margin:0 0 12px;font-size:14px">Bonjour${name ? ` ${escapeHtml(name)}` : ""},</p>
     <p style="margin:0 0 12px;font-size:14px">
       Vous avez demandé à réinitialiser votre mot de passe. Ce lien est valable une heure.
     </p>
     ${ctaButton(url, "Choisir un nouveau mot de passe")}
     <p style="margin:16px 0 0;font-size:12px;color:#666">
       Si vous n'êtes pas à l'origine de cette demande, ignorez ce message :
       votre mot de passe actuel reste valable.
     </p>`
  );

  await sendMail({ to, subject: "Réinitialisation de votre mot de passe — Thunderfam Group", html });
}

/**
 * Notification informative après changement effectif du mot de passe.
 * Sert d'alerte si le changement n'était pas volontaire.
 */
export async function sendPasswordChangedEmail(to: string, name?: string | null): Promise<void> {
  const html = layout(
    "Votre mot de passe a été modifié",
    `<p style="margin:0 0 12px;font-size:14px">Bonjour${name ? ` ${escapeHtml(name)}` : ""},</p>
     <p style="margin:0 0 12px;font-size:14px">
       Le mot de passe de votre compte Thunderfam vient d'être modifié, et toutes vos
       sessions ont été déconnectées.
     </p>
     <p style="margin:0;font-size:13px;color:#b0281a">
       Si vous n'êtes pas à l'origine de ce changement, contactez-nous immédiatement au
       ${escapeHtml(COMPANY_INFO.phone1)}.
     </p>`
  );

  await sendMail({ to, subject: "Votre mot de passe a été modifié — Thunderfam Group", html });
}
