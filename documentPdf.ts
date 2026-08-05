import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { qrBuffer } from "./qrService";
import {
  COMPANY_INFO,
  formatAmount,
  type DocumentLineItem,
} from "@shared/documents";

// ============================================================
// Générateur PDF unique pour TOUS les documents commerciaux.
//
// Le type de document (DEVIS / FACTURE / plus tard BON DE
// COMMANDE, AVOIR…) ne change que le titre et quelques libellés :
// la mise en page, le QR Code, le tableau, les totaux et le bloc
// signature sont mutualisés. Ajouter un nouveau type de document
// ne demande donc pas de dupliquer ce fichier.
// ============================================================

const COLORS = {
  black: "#0A0A0A",
  dark: "#111111",
  gold: "#F2B705",
  red: "#E74C3C",
  green: "#27AE60",
  blue: "#3B7DDD",
  grey: "#555555",
  lightGrey: "#F4F4F4",
  border: "#DDDDDD",
  white: "#FFFFFF",
};

// Le projet est en ESM ("type": "module") : `__dirname` n'existe pas.
// On résout donc le logo depuis le répertoire de travail, avec une
// variable d'environnement pour surcharger le chemin en production.
const LOGO_CANDIDATES = [
  process.env.THUNDERFAM_LOGO_PATH,
  path.join(process.cwd(), "thunderfam_logo_dark.jpg"),
  path.join(process.cwd(), "public/thunderfam_logo_dark.jpg"),
  path.join(process.cwd(), "assets/thunderfam_logo_dark.jpg"),
].filter((p): p is string => Boolean(p));

let cachedLogo: string | null | undefined;

function findLogo(): string | null {
  if (cachedLogo !== undefined) return cachedLogo;
  for (const p of LOGO_CANDIDATES) {
    try {
      if (fs.existsSync(p)) {
        cachedLogo = p;
        return p;
      }
    } catch {
      /* chemin inaccessible : on essaie le suivant */
    }
  }
  cachedLogo = null;
  return null;
}

export type CommercialDocKind = "DEVIS" | "FACTURE";

export interface CommercialDocument {
  kind: CommercialDocKind;
  number: string;
  /** Numéro du devis d'origine, affiché sur une facture. */
  relatedNumber?: string | null;
  date: string | Date;
  validityDays?: number | null;
  executionDelay?: string | null;
  dueDate?: string | Date | null;

  clientName?: string | null;
  clientAddress?: string | null;

  title?: string | null;
  description?: string | null;
  routeFrom?: string | null;
  routeTo?: string | null;

  items: DocumentLineItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  amountInWords?: string | null;
  currency: string;

  paymentTerms?: string | null;
  notes?: string | null;
  legalMentions?: string | null;

  clientSignature?: string | null;
  managerSignature?: string | null;
  companyStamp?: string | null;
}

function toIsoDate(v: string | Date | null | undefined): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function frDate(v: string | Date | null | undefined): string {
  const iso = toIsoDate(v);
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/** Décode une image base64 (avec ou sans préfixe data:) en Buffer. */
function decodeImage(b64?: string | null): Buffer | null {
  if (!b64) return null;
  try {
    const cleaned = b64.replace(/^data:image\/\w+;base64,/, "");
    const buf = Buffer.from(cleaned, "base64");
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

/**
 * Génère le PDF et le renvoie sous forme de Buffer.
 * Utilise `Buffer` plutôt qu'un stream pour pouvoir être stocké
 * (storagePut) ou joint à un e-mail sans double génération.
 */
export async function generateDocumentPdf(doc: CommercialDocument): Promise<Buffer> {
  // Régénéré à chaque appel à partir des données courantes -> toujours à jour.
  const qr = await qrBuffer({
    number: doc.number,
    clientName: doc.clientName,
    createdAt: doc.date,
    total: doc.total,
    currency: doc.currency,
  });

  return new Promise<Buffer>((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    pdf.on("data", (c: Buffer) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    const left = 40;
    const contentWidth = pdf.page.width - 80;

    // ---------- Bandeau d'en-tête ----------
    const headerH = 78;
    pdf.rect(left, 40, contentWidth, headerH).fill(COLORS.black);

    const logo = findLogo();
    if (logo) {
      try {
        pdf.image(logo, left + 12, 40 + 16, { width: 140 });
      } catch {
        /* logo illisible : on continue sans bloquer la génération */
      }
    }

    pdf
      .fillColor(COLORS.white)
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .text(COMPANY_INFO.name, left, 50, { width: contentWidth - 16, align: "right" })
      .font("Helvetica")
      .fontSize(8)
      .text(`RCCM : ${COMPANY_INFO.rccm}`, { width: contentWidth - 16, align: "right" })
      .text(COMPANY_INFO.address, { width: contentWidth - 16, align: "right" })
      .text(COMPANY_INFO.addressLine2, { width: contentWidth - 16, align: "right" })
      .text(`Tél. : ${COMPANY_INFO.phone1}  |  ${COMPANY_INFO.phone2}`, {
        width: contentWidth - 16,
        align: "right",
      });

    // Bande d'accent 4 couleurs
    const accentY = 40 + headerH;
    const q = contentWidth / 4;
    [COLORS.blue, COLORS.red, COLORS.gold, COLORS.green].forEach((c, i) => {
      pdf.rect(left + i * q, accentY, q, 5).fill(c);
    });

    let y = accentY + 18;

    // ---------- Titre ----------
    pdf.fillColor(COLORS.dark).font("Helvetica-Bold").fontSize(22).text(doc.kind, left, y);
    y += 26;

    const subtitleParts: string[] = [];
    if (doc.title) subtitleParts.push(doc.title);
    if (doc.routeFrom && doc.routeTo) subtitleParts.push(`${doc.routeFrom} -> ${doc.routeTo}`);
    if (subtitleParts.length) {
      const subtitle = subtitleParts.join(" — ");
      const subWidth = contentWidth * 0.58;
      // Mesure la hauteur réelle : le sous-titre peut passer sur
      // plusieurs lignes et viendrait alors chevaucher le bloc client.
      const subHeight = pdf.font("Helvetica").fontSize(9.5).heightOfString(subtitle, { width: subWidth });
      pdf.fillColor(COLORS.dark).text(subtitle, left, y, { width: subWidth });
      y += subHeight + 4;
    }
    y += 10;

    // ---------- Client (gauche) / QR + méta (droite) ----------
    const metaX = left + 300;
    const blockTop = y;

    pdf.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.grey).text("CLIENT", left, blockTop);
    pdf.font("Helvetica-Bold").fontSize(10.5).fillColor(COLORS.dark)
      .text(doc.clientName || "—", left, blockTop + 13, { width: 260 });
    if (doc.clientAddress) {
      pdf.font("Helvetica").fontSize(9)
        .text(doc.clientAddress, left, blockTop + 28, { width: 260 });
    }

    // QR Code — positionné juste AU-DESSUS du numéro de document
    const qrSize = 52;
    pdf.image(qr, metaX, blockTop, { width: qrSize, height: qrSize });
    pdf.font("Helvetica").fontSize(5.8).fillColor(COLORS.grey)
      .text("Scanner pour vérifier", metaX, blockTop + qrSize + 2, { width: qrSize + 30 });

    const metaRows: [string, string][] = [
      [doc.kind === "FACTURE" ? "N° de facture" : "N° du devis", doc.number],
    ];
    if (doc.kind === "FACTURE" && doc.relatedNumber) {
      metaRows.push(["Devis associé", doc.relatedNumber]);
    }
    metaRows.push(["Date d'émission", frDate(doc.date)]);
    if (doc.kind === "DEVIS") {
      metaRows.push(["Validité", `${doc.validityDays ?? 30} jours`]);
      metaRows.push(["Délai d'exécution", doc.executionDelay || "À convenir avec le client"]);
    } else if (doc.dueDate) {
      metaRows.push(["Échéance", frDate(doc.dueDate)]);
    }

    let metaY = blockTop + qrSize + 14;
    metaRows.forEach(([label, value]) => {
      pdf.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.grey).text(label, metaX, metaY);
      const vw = contentWidth - (metaX + 95 - left);
      const vh = pdf.font("Helvetica").fontSize(9).heightOfString(value, { width: vw });
      pdf.font("Helvetica").fontSize(9).fillColor(COLORS.dark).text(value, metaX + 95, metaY, { width: vw });
      metaY += Math.max(15, vh + 3);
    });

    y = Math.max(blockTop + 70, metaY + 8);
    pdf.moveTo(left, y).lineTo(left + contentWidth, y).strokeColor(COLORS.border).stroke();
    y += 14;

    // ---------- Tableau des prestations ----------
    const cols = [
      contentWidth * 0.34,
      contentWidth * 0.1,
      contentWidth * 0.1,
      contentWidth * 0.16,
      contentWidth * 0.1,
      contentWidth * 0.2,
    ];
    const headers = ["Désignation", "Qté", "Unité", "P.U.", "Remise", "Montant HT"];
    const rowH = 22;

    const drawRow = (cells: string[], isHeader: boolean, bg?: string) => {
      // Saut de page si nécessaire
      if (y + rowH > pdf.page.height - 120) {
        pdf.addPage();
        y = 50;
      }
      pdf.rect(left, y, contentWidth, rowH).fill(isHeader ? COLORS.black : bg || COLORS.white);
      pdf.strokeColor(COLORS.border).rect(left, y, contentWidth, rowH).stroke();
      let x = left;
      cells.forEach((cell, i) => {
        pdf
          .fillColor(isHeader ? COLORS.white : COLORS.dark)
          .font(isHeader ? "Helvetica-Bold" : "Helvetica")
          .fontSize(8.3)
          .text(cell, x + 5, y + 6.5, { width: cols[i] - 10, align: i === 0 ? "left" : "right", lineBreak: false });
        x += cols[i];
      });
      y += rowH;
    };

    drawRow(headers, true);
    doc.items.forEach((item, i) => {
      drawRow(
        [
          item.name,
          String(item.qty),
          item.unit || "",
          formatAmount(item.unitPrice),
          item.discountPct ? `${item.discountPct}%` : "—",
          formatAmount(item.total ?? 0),
        ],
        false,
        i % 2 === 0 ? COLORS.white : COLORS.lightGrey
      );
    });

    y += 10;

    // ---------- Totaux ----------
    const tX = left + contentWidth - 230;
    const totalLine = (label: string, value: string) => {
      pdf.font("Helvetica").fontSize(9.3).fillColor(COLORS.dark)
        .text(label, tX, y, { width: 125 })
        .text(value, tX + 125, y, { width: 105, align: "right" });
      y += 15;
    };
    totalLine("Sous-total HT", `${formatAmount(doc.subtotal)} ${doc.currency}`);
    if (doc.discountTotal > 0) totalLine("Total remises", `${formatAmount(doc.discountTotal)} ${doc.currency}`);
    totalLine("Total TVA", `${formatAmount(doc.taxTotal)} ${doc.currency}`);

    y += 4;
    pdf.rect(tX, y, 230, 26).fill(COLORS.gold);
    pdf.fillColor(COLORS.dark).font("Helvetica-Bold").fontSize(11)
      .text("TOTAL GÉNÉRAL", tX + 8, y + 8)
      .text(`${formatAmount(doc.total)} ${doc.currency}`, tX, y + 8, { width: 222, align: "right" });
    y += 36;

    if (doc.amountInWords) {
      pdf.font("Helvetica-Oblique").fontSize(8).fillColor(COLORS.grey)
        .text(`Montant en lettres : ${doc.amountInWords}`, left, y, { width: contentWidth });
      y += 14;
    }
    if (doc.notes) {
      pdf.font("Helvetica-Oblique").fontSize(8).fillColor(COLORS.grey)
        .text(doc.notes, left, y, { width: contentWidth });
      y += 14;
    }
    y += 6;

    // ---------- Conditions de paiement ----------
    if (doc.paymentTerms) {
      const boxH = Math.max(
        46,
        pdf.font("Helvetica").fontSize(8.2).heightOfString(doc.paymentTerms, { width: contentWidth - 20 }) + 30
      );
      if (y + boxH > pdf.page.height - 150) {
        pdf.addPage();
        y = 50;
      }
      pdf.rect(left, y, contentWidth, boxH).fillAndStroke(COLORS.lightGrey, COLORS.gold);
      pdf.fillColor(COLORS.dark).font("Helvetica-Bold").fontSize(10)
        .text("CONDITIONS DE PAIEMENT", left + 10, y + 8);
      pdf.font("Helvetica").fontSize(8.2)
        .text(doc.paymentTerms, left + 10, y + 22, { width: contentWidth - 20 });
      y += boxH + 14;
    }

    // ---------- Signatures ----------
    if (y > pdf.page.height - 130) {
      pdf.addPage();
      y = 50;
    }
    const sigRight = left + 300;
    pdf.font("Helvetica-Bold").fontSize(8.5).fillColor(COLORS.grey)
      .text("Bon pour accord — Le Client", left, y)
      .text("Pour Thunderfam Group Limited Côte d'Ivoire", sigRight, y);
    y += 14;

    const clientSig = decodeImage(doc.clientSignature);
    const managerSig = decodeImage(doc.managerSignature);
    const stamp = decodeImage(doc.companyStamp);

    const sigTop = y;
    if (clientSig) {
      try {
        pdf.image(clientSig, left, sigTop, { fit: [140, 46] });
      } catch { /* image invalide : on laisse la ligne vierge */ }
    }
    if (managerSig) {
      try {
        pdf.image(managerSig, sigRight, sigTop, { fit: [140, 46] });
      } catch { /* idem */ }
    }
    if (stamp) {
      try {
        pdf.image(stamp, sigRight + 150, sigTop, { fit: [70, 70] });
      } catch { /* idem */ }
    }

    y = sigTop + 52;
    pdf.font("Helvetica").fontSize(9).fillColor(COLORS.dark)
      .text("Signature : _______________________", left, y)
      .text("Signature du responsable : _______________________", sigRight, y);

    y += 22;
    pdf.moveTo(left, y).lineTo(left + contentWidth, y).strokeColor(COLORS.border).stroke();
    pdf.font("Helvetica-Oblique").fontSize(7).fillColor(COLORS.grey)
      .text(
        doc.legalMentions ||
          `${COMPANY_INFO.name} — RCCM ${COMPANY_INFO.rccm} — ${COMPANY_INFO.address}, ${COMPANY_INFO.addressLine2}`,
        left,
        y + 5,
        { width: contentWidth }
      );

    pdf.end();
  });
}
