import nodemailer, { type Transporter } from "nodemailer";
import { COMPANY_INFO, formatAmount } from "@shared/documents";

// ============================================================
// Envoi des documents commerciaux par e-mail.
//
// Configuration via variables d'environnement (aucun identifiant
// en dur dans le code) :
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS,
//   SMTP_FROM  (ex: "Thunderfam Group <devis@thunderfam.com>")
//
// Si SMTP_HOST n'est pas défini, l'envoi est refusé explicitement
// plutôt que d'échouer silencieusement.
// ============================================================

let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

function getTransporter(): Transporter {
  if (!isEmailConfigured()) {
    throw new Error(
      "Envoi d'e-mail non configuré : définissez SMTP_HOST, SMTP_PORT, SMTP_USER et SMTP_PASS."
    );
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

export interface SendDocumentOptions {
  to: string;
  cc?: string;
  kind: "DEVIS" | "FACTURE";
  number: string;
  clientName?: string | null;
  total: number;
  currency: string;
  /** Message libre saisi par l'utilisateur ; un texte par défaut est utilisé sinon. */
  customMessage?: string | null;
  pdf: Buffer;
  /** Pièce jointe Word optionnelle. */
  docx?: Buffer | null;
}

function defaultBodyHtml(o: SendDocumentOptions): string {
  const label = o.kind === "FACTURE" ? "la facture" : "le devis";
  const intro = o.customMessage
    ? `<p style="margin:0 0 16px">${escapeHtml(o.customMessage).replace(/\n/g, "<br/>")}</p>`
    : `<p style="margin:0 0 16px">Bonjour${o.clientName ? ` ${escapeHtml(o.clientName)}` : ""},<br/><br/>
       Veuillez trouver ci-joint ${label} <strong>${escapeHtml(o.number)}</strong>
       d'un montant total de <strong>${formatAmount(o.total)} ${escapeHtml(o.currency)}</strong>.</p>`;

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f7f7f8;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#111">
  <div style="max-width:640px;margin:0 auto;background:#fff">
    <div style="background:#0A0A0A;padding:18px 24px;color:#fff">
      <div style="font-size:15px;font-weight:700">${escapeHtml(COMPANY_INFO.name)}</div>
      <div style="font-size:11px;opacity:.8">RCCM : ${escapeHtml(COMPANY_INFO.rccm)}</div>
    </div>
    <div style="height:4px;background:linear-gradient(90deg,#3B7DDD 25%,#E74C3C 25% 50%,#F2B705 50% 75%,#27AE60 75%)"></div>
    <div style="padding:24px">
      ${intro}
      <p style="margin:0 0 16px;font-size:13px;color:#555">
        Le document joint comporte un QR Code permettant d'en vérifier l'authenticité.
      </p>
      <p style="margin:24px 0 0;font-size:12px;color:#555">
        ${escapeHtml(COMPANY_INFO.address)}<br/>${escapeHtml(COMPANY_INFO.addressLine2)}<br/>
        Tél. : ${escapeHtml(COMPANY_INFO.phone1)} — ${escapeHtml(COMPANY_INFO.phone2)}
      </p>
    </div>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendDocumentEmail(o: SendDocumentOptions): Promise<{ messageId: string }> {
  const tx = getTransporter();
  const label = o.kind === "FACTURE" ? "Facture" : "Devis";

  const attachments: any[] = [
    { filename: `${o.number}.pdf`, content: o.pdf, contentType: "application/pdf" },
  ];
  if (o.docx) {
    attachments.push({
      filename: `${o.number}.docx`,
      content: o.docx,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  }

  const info = await tx.sendMail({
    from: process.env.SMTP_FROM || `${COMPANY_INFO.name} <no-reply@thunderfam.com>`,
    to: o.to,
    cc: o.cc || undefined,
    subject: `${label} ${o.number} — ${COMPANY_INFO.name}`,
    html: defaultBodyHtml(o),
    attachments,
  });

  return { messageId: info.messageId };
}

/**
 * Envoi générique, réutilisé par les e-mails d'authentification
 * (réinitialisation de mot de passe, vérification d'adresse) afin de
 * ne pas dupliquer la configuration du transport.
 */
export async function sendMail(o: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ messageId: string }> {
  const tx = getTransporter();
  const info = await tx.sendMail({
    from: process.env.SMTP_FROM || `${COMPANY_INFO.name} <no-reply@thunderfam.com>`,
    to: o.to,
    subject: o.subject,
    html: o.html,
  });
  return { messageId: info.messageId };
}

export { escapeHtml };
