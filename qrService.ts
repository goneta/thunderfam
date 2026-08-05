import QRCode from "qrcode";
import { buildQrContent, buildQrPayload, type DocumentQrPayload } from "@shared/documents";

// ============================================================
// Génération du QR Code des documents commerciaux.
//
// Le QR est TOUJOURS dérivé des données courantes du document au
// moment de l'export : il n'est jamais stocké ni mis en cache.
// Conséquence directe : toute modification du devis (client,
// montant, date…) se reflète automatiquement dans le QR Code du
// PDF et du Word suivants, sans régénération manuelle ni risque
// de désynchronisation.
// ============================================================

export interface QrSource {
  number: string;
  clientName?: string | null;
  createdAt: string | Date;
  total: number;
  currency?: string | null;
}

/** Contenu JSON encodé dans le QR (lisible par une app mobile de vérification). */
export function qrPayload(doc: QrSource): DocumentQrPayload {
  return buildQrPayload(doc);
}

/** QR Code en PNG (Buffer) — pour pdfkit et docx. */
export async function qrBuffer(doc: QrSource): Promise<Buffer> {
  return QRCode.toBuffer(buildQrContent(doc), {
    type: "png",
    margin: 1,
    width: 240,
    errorCorrectionLevel: "M",
    color: { dark: "#0A0A0A", light: "#FFFFFF" },
  });
}

/** QR Code en data URL — pour un aperçu HTML côté frontend. */
export async function qrDataUrl(doc: QrSource): Promise<string> {
  return QRCode.toDataURL(buildQrContent(doc), {
    margin: 1,
    width: 240,
    errorCorrectionLevel: "M",
  });
}
